import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToastStore } from '@/stores/toastStore';
import { Ionicons } from '@expo/vector-icons';

import { useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUpdateWorkspace, useArchiveWorkspace, useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useSendInvitation } from '@/hooks/useInvitations';
import { useTheme } from '@/hooks/use-theme';

import EventsTab from '@/components/events/EventsTab';
import CategoriesTab from '@/components/events/CategoriesTab';
import NotesTab from '@/components/notes/NotesTab';
import DocumentsScreen from '@/app/documents';

type SettingsTab = 'WORKSPACE' | 'EVENTS' | 'CATEGORIES' | 'NOTES' | 'DOCUMENTS';

export default function MoreScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.clearAuth);
  const handleLogout = () => {
    queryClient.clear();
    logout();
  };
  const user = useAuthStore((state) => state.user);
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const { tab, action } = useLocalSearchParams<{ tab?: SettingsTab; action?: string }>();

  const updateMutation = useUpdateWorkspace();
  const archiveMutation = useArchiveWorkspace();
  const sendInviteMutation = useSendInvitation();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('WORKSPACE');

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const { showToast } = useToastStore();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Edit States
  const [name, setName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Invitation States
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [selectedModules, setSelectedModules] = useState<string[]>(['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget']);
  const [allocatedBudget, setAllocatedBudget] = useState('');

  const { data: membersData, isLoading: membersLoading } = useWorkspaceMembers(currentWorkspace?.id);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setWeddingDate(currentWorkspace.weddingDate);
    }
  }, [currentWorkspace]);

  const handleUpdate = async () => {
    if (!currentWorkspace) return;
    if (name.trim().length === 0) {
      showToast('Validation Error', 'Workspace name is required', 'error');
      return;
    }

    try {
      const res = await updateMutation.mutateAsync({
        id: currentWorkspace.id,
        name: name.trim(),
        weddingDate,
      });
      // Update store
      setCurrentWorkspace({
        ...currentWorkspace,
        name: res.workspace.name,
        weddingDate: res.workspace.wedding_date,
      });
      setIsEditing(false);
      setShowDatePicker(false);
      showToast('Success', 'Workspace updated successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update workspace', 'error');
    }
  };

  const handleArchive = async () => {
    if (!currentWorkspace) return;
    try {
      await archiveMutation.mutateAsync(currentWorkspace.id);
      setCurrentWorkspace(null);
      router.replace('/');
      showToast('Success', 'Workspace archived successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to archive workspace', 'error');
    }
  };

  const handleSendInvite = async () => {
    if (!currentWorkspace) return;
    if (invitePhone.trim().length < 8) {
      showToast('Validation Error', 'Please enter a valid phone number', 'error');
      return;
    }

    try {
      const permissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> = {};
      const modules = ['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget'];
      modules.forEach(mod => {
        const isAllowed = selectedModules.includes(mod);
        permissions[mod] = {
          view: isAllowed,
          create: isAllowed,
          edit: isAllowed,
          delete: isAllowed && inviteRole !== 'VIEWER',
        };
      });

      const budgetNum = allocatedBudget ? parseFloat(allocatedBudget) : null;

      const res = await sendInviteMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        phoneNumber: invitePhone.trim(),
        role: inviteRole,
        permissions,
        allocatedBudget: budgetNum,
      });

      if (res.userExists) {
        showToast('Success', `Invitation sent! ${invitePhone} is an active user and was notified.`, 'success');
      } else {
        showToast('Success', `Pending invitation created! ${invitePhone} is not registered yet, they will see it when they sign up.`, 'success');
      }
      setInvitePhone('');
      setSelectedModules(['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget']);
      setAllocatedBudget('');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to send invitation', 'error');
    }
  };

  const isOwnerOrEditor = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'EDITOR';
  const isOwner = currentWorkspace?.role === 'OWNER';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Settings & More</ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              Manage workspace configuration, events, and categories
            </ThemedText>
          </ThemedView>

          {/* Segment Toggle Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.segmentContainerWrapper}
            contentContainerStyle={styles.segmentScroll}
          >
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                { backgroundColor: activeTab === 'WORKSPACE' ? theme.text : theme.backgroundElement }
              ]}
              onPress={() => setActiveTab('WORKSPACE')}
            >
              <Ionicons name="briefcase-outline" size={15} color={activeTab === 'WORKSPACE' ? theme.background : theme.text} />
              <ThemedText style={{ color: activeTab === 'WORKSPACE' ? theme.background : theme.text, fontSize: 13, fontWeight: 'bold' }}>
                Workspace
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                { backgroundColor: activeTab === 'EVENTS' ? theme.text : theme.backgroundElement }
              ]}
              onPress={() => setActiveTab('EVENTS')}
            >
              <Ionicons name="calendar-outline" size={15} color={activeTab === 'EVENTS' ? theme.background : theme.text} />
              <ThemedText style={{ color: activeTab === 'EVENTS' ? theme.background : theme.text, fontSize: 13, fontWeight: 'bold' }}>
                Events
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                { backgroundColor: activeTab === 'CATEGORIES' ? theme.text : theme.backgroundElement }
              ]}
              onPress={() => setActiveTab('CATEGORIES')}
            >
              <Ionicons name="pricetags-outline" size={15} color={activeTab === 'CATEGORIES' ? theme.background : theme.text} />
              <ThemedText style={{ color: activeTab === 'CATEGORIES' ? theme.background : theme.text, fontSize: 13, fontWeight: 'bold' }}>
                Categories
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                { backgroundColor: activeTab === 'NOTES' ? theme.text : theme.backgroundElement }
              ]}
              onPress={() => setActiveTab('NOTES')}
            >
              <Ionicons name="document-text-outline" size={15} color={activeTab === 'NOTES' ? theme.background : theme.text} />
              <ThemedText style={{ color: activeTab === 'NOTES' ? theme.background : theme.text, fontSize: 13, fontWeight: 'bold' }}>
                Notes
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                { backgroundColor: activeTab === 'DOCUMENTS' ? theme.text : theme.backgroundElement }
              ]}
              onPress={() => setActiveTab('DOCUMENTS')}
            >
              <Ionicons name="document-attach-outline" size={15} color={activeTab === 'DOCUMENTS' ? theme.background : theme.text} />
              <ThemedText style={{ color: activeTab === 'DOCUMENTS' ? theme.background : theme.text, fontSize: 13, fontWeight: 'bold' }}>
                Documents
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>

          {/* Conditional rendering based on segment selection */}
          {activeTab === 'WORKSPACE' && (
            <ThemedView style={{ gap: Spacing.four }}>
              {/* Current Workspace Info */}
              {currentWorkspace ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>Active Workspace</ThemedText>
                  <ThemedView style={styles.detailRow}>
                    <ThemedText type="default">Name:</ThemedText>
                    <ThemedText type="smallBold">{currentWorkspace.name}</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.detailRow}>
                    <ThemedText type="default">Wedding Date:</ThemedText>
                    <ThemedText type="smallBold">
                      {new Date(currentWorkspace.weddingDate).toLocaleDateString()}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.detailRow}>
                    <ThemedText type="default">My Role:</ThemedText>
                    <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
                      {currentWorkspace.role}
                    </ThemedText>
                  </ThemedView>

                  <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: theme.text }]}
                    onPress={() => {
                      setCurrentWorkspace(null);
                      router.replace('/');
                    }}
                  >
                    <ThemedText style={{ color: theme.text, fontWeight: 'bold' }}>
                      Switch Workspace
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ) : (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>No Active Workspace</ThemedText>
                  <ThemedText type="default" style={styles.placeholderText}>
                    Select or create a workspace on the dashboard to access full features.
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: theme.text }]}
                    onPress={() => router.replace('/')}
                  >
                    <ThemedText style={{ color: theme.text, fontWeight: 'bold' }}>
                      Go to Workspaces
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              )}

              {/* Invite Collaborator Section */}
              {currentWorkspace && isOwner && (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>Invite Collaborator</ThemedText>
                  <ThemedView style={styles.form}>
                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Phone Number</ThemedText>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="e.g. +1234567890"
                        placeholderTextColor={theme.textSecondary}
                        value={invitePhone}
                        onChangeText={setInvitePhone}
                        keyboardType="phone-pad"
                      />
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Role</ThemedText>
                      <ThemedView style={styles.roleContainer}>
                        <TouchableOpacity
                          style={[
                            styles.roleSelectBtn,
                            {
                              backgroundColor: inviteRole === 'EDITOR' ? theme.text : theme.background,
                              borderColor: theme.text,
                            },
                          ]}
                          onPress={() => setInviteRole('EDITOR')}
                        >
                          <ThemedText style={{ color: inviteRole === 'EDITOR' ? theme.background : theme.text }}>
                            Editor
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.roleSelectBtn,
                            {
                              backgroundColor: inviteRole === 'VIEWER' ? theme.text : theme.background,
                              borderColor: theme.text,
                            },
                          ]}
                          onPress={() => setInviteRole('VIEWER')}
                        >
                          <ThemedText style={{ color: inviteRole === 'VIEWER' ? theme.background : theme.text }}>
                            Viewer
                          </ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Budget Limit (Optional)</ThemedText>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="e.g. 50000"
                        placeholderTextColor={theme.textSecondary}
                        value={allocatedBudget}
                        onChangeText={setAllocatedBudget}
                        keyboardType="numeric"
                      />
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Allowed Sections (Module Access)</ThemedText>
                      <ThemedView style={styles.checkboxContainer}>
                        {['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget'].map((mod) => {
                          const isChecked = selectedModules.includes(mod);
                          return (
                            <TouchableOpacity
                              key={mod}
                              style={[
                                styles.checkboxBtn,
                                {
                                  borderColor: isChecked ? theme.text : theme.border,
                                  backgroundColor: isChecked ? 'rgba(233, 30, 99, 0.08)' : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                if (isChecked) {
                                  setSelectedModules(selectedModules.filter(m => m !== mod));
                                } else {
                                  setSelectedModules([...selectedModules, mod]);
                                }
                              }}
                            >
                              <Ionicons
                                name={isChecked ? 'checkbox-outline' : 'square-outline'}
                                size={14}
                                color={isChecked ? theme.text : theme.textSecondary}
                              />
                              <ThemedText style={{ fontSize: 12, color: isChecked ? theme.text : theme.textSecondary }}>
                                {mod}
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </ThemedView>
                    </ThemedView>

                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: theme.text }]}
                      onPress={handleSendInvite}
                      disabled={sendInviteMutation.isPending}
                    >
                      {sendInviteMutation.isPending ? (
                        <ActivityIndicator color={theme.background} />
                      ) : (
                        <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                          Send Invitation
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              )}

              {/* Workspace Members & Invitations Section */}
              {currentWorkspace && (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>Workspace Members & Invites</ThemedText>
                  
                  {membersLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <ThemedView style={styles.membersSection}>
                      {/* Current Members */}
                      {membersData?.members.map((member) => {
                        // Compute permissions summary
                        let permText = 'Full Access';
                        if (member.role !== 'OWNER' && member.permissions) {
                          const denied: string[] = [];
                          ['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget'].forEach(m => {
                            if (member.permissions?.[m]?.view === false) {
                              denied.push(m);
                            }
                          });
                          if (denied.length > 0) {
                            permText = `Restricted: ${denied.join(', ')}`;
                          }
                        }

                        return (
                          <ThemedView key={member.id} style={[styles.memberItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <ThemedView style={styles.memberHeader}>
                              <ThemedText type="smallBold">{member.name}</ThemedText>
                              <ThemedView style={[styles.badge, { backgroundColor: member.role === 'OWNER' ? 'rgba(233, 30, 99, 0.15)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <ThemedText style={[styles.badgeText, { color: member.role === 'OWNER' ? '#E91E63' : theme.text }]}>
                                  {member.role}
                                </ThemedText>
                              </ThemedView>
                            </ThemedView>
                            <ThemedText type="small" style={{ opacity: 0.6 }}>Phone: {member.phone}</ThemedText>
                            <ThemedText type="small" style={{ opacity: 0.6 }}>
                              Budget Limit: {member.allocated_budget ? `₹${Number(member.allocated_budget).toLocaleString('en-IN')}` : 'Unlimited'}
                            </ThemedText>
                            <ThemedText style={[styles.permissionsSummary, { color: permText.startsWith('Restricted') ? '#ff3b30' : theme.textSecondary }]}>
                              Permissions: {permText}
                            </ThemedText>
                          </ThemedView>
                        );
                      })}

                      {/* Pending Invites */}
                      {membersData?.invitations && membersData.invitations.length > 0 && (
                        <>
                          <ThemedText type="smallBold" style={[styles.sectionTitle, { marginTop: Spacing.two }]}>Pending Invitations</ThemedText>
                          {membersData.invitations.map((invite) => {
                            let permText = 'Full Access';
                            if (invite.permissions) {
                              const denied: string[] = [];
                              ['Expenses', 'Tasks', 'Events', 'Documents', 'Notes', 'Budget'].forEach(m => {
                                if (invite.permissions?.[m]?.view === false) {
                                  denied.push(m);
                                }
                              });
                              if (denied.length > 0) {
                                permText = `Restricted: ${denied.join(', ')}`;
                              }
                            }

                            return (
                              <ThemedView key={invite.id} style={[styles.memberItem, { backgroundColor: theme.background, borderColor: 'rgba(233, 30, 99, 0.2)' }]}>
                                <ThemedView style={styles.memberHeader}>
                                  <ThemedText type="smallBold">{invite.phone_number}</ThemedText>
                                  <ThemedView style={[styles.badge, { backgroundColor: 'rgba(233, 30, 99, 0.08)' }]}>
                                    <ThemedText style={[styles.badgeText, { color: '#E91E63' }]}>
                                      {invite.role} (PENDING)
                                    </ThemedText>
                                  </ThemedView>
                                </ThemedView>
                                <ThemedText type="small" style={{ opacity: 0.6 }}>
                                  Budget Limit: {invite.allocated_budget ? `₹${Number(invite.allocated_budget).toLocaleString('en-IN')}` : 'Unlimited'}
                                </ThemedText>
                                <ThemedText style={[styles.permissionsSummary, { color: permText.startsWith('Restricted') ? '#ff3b30' : theme.textSecondary }]}>
                                  Permissions: {permText}
                                </ThemedText>
                              </ThemedView>
                            );
                          })}
                        </>
                      )}
                    </ThemedView>
                  )}
                </ThemedView>
              )}

              {/* Edit Workspace details */}
              {currentWorkspace && isOwnerOrEditor && (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {isEditing ? 'Edit Workspace' : 'Configure Workspace'}
                  </ThemedText>
                  
                  {isEditing ? (
                    <ThemedView style={styles.form}>
                      <ThemedView style={styles.inputWrapper}>
                        <ThemedText type="smallBold">Workspace Name</ThemedText>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                          value={name}
                          onChangeText={setName}
                        />
                      </ThemedView>
                      <ThemedView style={styles.inputWrapper}>
                        <ThemedText type="smallBold">Wedding Date</ThemedText>
                        <TouchableOpacity
                          style={[
                            styles.input,
                            {
                              backgroundColor: theme.backgroundElement,
                              borderColor: theme.backgroundSelected,
                              borderWidth: 1,
                              justifyContent: 'center',
                            },
                          ]}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <ThemedText style={{ color: weddingDate ? theme.text : theme.textSecondary }}>
                            {weddingDate || 'Select Wedding Date'}
                          </ThemedText>
                        </TouchableOpacity>
                        {showDatePicker && (
                          <DateTimePicker
                            value={(() => {
                              if (!weddingDate) return new Date();
                              const parsed = Date.parse(weddingDate);
                              return isNaN(parsed) ? new Date() : new Date(parsed);
                            })()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShowDatePicker(false);
                              if (selectedDate) {
                                setWeddingDate(selectedDate.toISOString().split('T')[0]);
                              }
                            }}
                          />
                        )}
                      </ThemedView>

                      <ThemedView style={styles.btnRow}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: theme.text }]}
                          onPress={handleUpdate}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <ActivityIndicator color={theme.background} />
                          ) : (
                            <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                              Save
                            </ThemedText>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: theme.background }]}
                          onPress={() => setIsEditing(false)}
                        >
                          <ThemedText>Cancel</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    </ThemedView>
                  ) : (
                    <TouchableOpacity
                      style={[styles.outlineButton, { borderColor: theme.text }]}
                      onPress={() => setIsEditing(true)}
                    >
                      <ThemedText style={{ color: theme.text, fontWeight: 'bold' }}>
                        Edit Workspace Details
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </ThemedView>
              )}

              {/* User Account Info */}
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>My Account</ThemedText>
                {user && (
                  <ThemedView style={styles.userContainer}>
                    <ThemedText type="default">Name: <ThemedText type="smallBold">{user.name}</ThemedText></ThemedText>
                    <ThemedText type="default">Phone: <ThemedText type="smallBold">{user.phone}</ThemedText></ThemedText>
                  </ThemedView>
                )}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                >
                  <ThemedText style={styles.logoutText}>Log Out</ThemedText>
                </TouchableOpacity>
              </ThemedView>

              {/* Danger Zone */}
              {currentWorkspace && isOwner && (
                <ThemedView type="backgroundElement" style={[styles.card, styles.dangerCard]}>
                  <ThemedText type="smallBold" style={styles.dangerTitle}>Danger Zone</ThemedText>
                  <ThemedText type="small" style={styles.dangerDesc}>
                    Archiving the workspace hides it from all members. You cannot undo this.
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.archiveBtn}
                    onPress={handleArchive}
                    disabled={archiveMutation.isPending}
                  >
                    {archiveMutation.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.archiveText}>Archive Workspace</ThemedText>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              )}
            </ThemedView>
          )}

          {activeTab === 'EVENTS' && (
            <EventsTab initialMode={action === 'create' ? 'CREATE' : 'LIST'} />
          )}

          {activeTab === 'CATEGORIES' && <CategoriesTab />}

          {activeTab === 'NOTES' && <NotesTab />}

          {activeTab === 'DOCUMENTS' && <DocumentsScreen nested={true} />}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  subtitle: {
    opacity: 0.7,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    opacity: 0.6,
  },
  outlineButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
  inputWrapper: {
    gap: Spacing.one,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  button: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleSelectBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  smallBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userContainer: {
    gap: Spacing.one,
  },
  logoutBtn: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dangerCard: {
    borderColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
  },
  dangerTitle: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dangerDesc: {
    opacity: 0.6,
  },
  archiveBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveText: {
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  segmentContainerWrapper: {
    marginBottom: Spacing.two,
  },
  segmentScroll: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  segmentBtn: {
    paddingHorizontal: Spacing.three,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  checkboxBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membersSection: {
    gap: Spacing.two,
  },
  memberItem: {
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.one,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  permissionsSummary: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});
