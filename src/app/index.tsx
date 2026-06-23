import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Image,
  Dimensions,
  Platform,
  Modal,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import WorkspaceSwitcher from '@/components/workspaces/WorkspaceSwitcher';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBudget, useExpensesList } from '@/hooks/useBudgetAndExpenses';
import { useTasks } from '@/hooks/useTasks';
import { useEvents, useUpdateEvent, useDeleteEvent } from '@/hooks/useEventsAndCategories';
import {
  useNotificationsList,
  useMarkAsRead,
  useRegisterPushToken,
  registerForPushNotificationsAsync,
} from '@/hooks/useNotifications';
import { usePendingInvitations, useRespondInvitation } from '@/hooks/useInvitations';
import { safeFormatDate } from '@/utils/date';
import { router } from 'expo-router';
import { useUpdateWorkspace } from '@/hooks/useWorkspaces';
import * as DocumentPicker from 'expo-document-picker';
import { useToastStore } from '@/stores/toastStore';
import { apiRequest, apiUploadRequest } from '@/utils/api';

const resolveFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const host = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${host}${url}`;
};

const CATEGORY_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800'];

export default function DashboardScreen() {
  const theme = useTheme();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [budgetAnim] = useState(new Animated.Value(0));
  const [tasksAnim] = useState(new Animated.Value(0));

  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const updateWorkspaceMutation = useUpdateWorkspace();
  const { showToast } = useToastStore();

  const handleUpdateCoverImage = async () => {
    if (!currentWorkspace) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUpdatingCover(true);
      const asset = result.assets[0];

      // Prepare form data
      const formData = new FormData();
      formData.append('workspaceId', currentWorkspace.id);
      formData.append('folderId', 'root');
      
      if (Platform.OS === 'web' && (asset as any).file) {
        formData.append('file', (asset as any).file, asset.name || 'cover_image.jpg');
      } else {
        const fileResponse = await fetch(asset.uri);
        const fileBuffer = await fileResponse.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        formData.append('file', {
          uri: asset.uri,
          name: asset.name || 'cover_image.jpg',
          type: asset.mimeType || 'image/jpeg',
          file: {
            name: asset.name || 'cover_image.jpg',
            type: asset.mimeType || 'image/jpeg',
            bytes: async () => fileBytes,
          }
        } as any);
      }

      // Call documents upload endpoint
      const uploadData = await apiUploadRequest<{ document: { file_url: string } }>('/documents/upload', formData);

      const imageUrl = uploadData.document.file_url;

      // Update workspace cover_image_url
      await updateWorkspaceMutation.mutateAsync({
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        weddingDate: currentWorkspace.weddingDate,
        coverImageUrl: imageUrl,
      });

      // Update local storage/state with the updated workspace
      setCurrentWorkspace({
        ...currentWorkspace,
        cover_image_url: imageUrl,
      } as any);

      showToast('Success', 'Cover image updated successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update cover image', 'error');
    } finally {
      setIsUpdatingCover(false);
    }
  };

  // Queries
  const { data: budgetData, isLoading: budgetLoading } = useBudget(currentWorkspace?.id);
  const { data: expensesData, isLoading: expensesLoading } = useExpensesList(currentWorkspace?.id);
  const { data: tasksData, isLoading: tasksLoading } = useTasks(currentWorkspace?.id);
  const { data: eventsData, isLoading: eventsLoading } = useEvents(currentWorkspace?.id);
  const { data: notificationsData, isLoading: notificationsLoading } = useNotificationsList();
  const { data: invitesData, refetch: refetchInvites } = usePendingInvitations();

  const markAsReadMutation = useMarkAsRead();
  const registerPushTokenMutation = useRegisterPushToken();
  const respondInviteMutation = useRespondInvitation();

  const [showNotificationsTray, setShowNotificationsTray] = useState(false);
  const [notificationsActiveTab, setNotificationsActiveTab] = useState<'notifications' | 'invitations'>('notifications');

  // Event Edit States
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const [showStartPicker, setShowStartPicker] = useState<'none' | 'date' | 'time'>('none');
  const [showEndPicker, setShowEndPicker] = useState<'none' | 'date' | 'time'>('none');

  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const startEditingEvent = () => {
    if (!selectedEvent) return;
    setEventTitle(selectedEvent.title);
    setEventDescription(selectedEvent.description || '');
    setEventStartTime(selectedEvent.start_time);
    setEventEndTime(selectedEvent.end_time);
    setEventLocation(selectedEvent.location || '');
    setIsEditingEvent(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent || !currentWorkspace) return;
    if (eventTitle.trim().length === 0) {
      showToast('Validation Error', 'Event title is required', 'error');
      return;
    }
    try {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        workspaceId: currentWorkspace.id,
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        startTime: eventStartTime,
        endTime: eventEndTime,
        location: eventLocation.trim() || undefined,
      });
      showToast('Success', 'Event updated successfully', 'success');
      setIsEditingEvent(false);
      setSelectedEventId(null);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update event', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !currentWorkspace) return;
    try {
      await deleteEventMutation.mutateAsync({
        id: selectedEvent.id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Event deleted successfully', 'success');
      setIsEditingEvent(false);
      setSelectedEventId(null);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete event', 'error');
    }
  };

  // Push notifications registration
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          registerPushTokenMutation.mutate({ pushToken: token });
        }
      })
      .catch((err) => console.error('Error fetching Expo Push Token:', err));
  }, []);

  // 1. Budget Calculations (Completely Dynamic)
  const budget = budgetData?.budget;
  const allocated = budget ? Number(budget.allocated) : 0;
  const totalSpent = budget ? Number(budget.spent) : 0;
  const remaining = allocated - totalSpent;
  const budgetPercent = allocated > 0 ? Math.round((totalSpent / allocated) * 100) : 0;

  // 2. Task metrics
  const tasks = tasksData?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Animate progress bars on load or change
  useEffect(() => {
    budgetAnim.setValue(0);
    tasksAnim.setValue(0);
    Animated.parallel([
      Animated.timing(budgetAnim, {
        toValue: budgetPercent || 0,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(tasksAnim, {
        toValue: taskProgressPercent || 0,
        duration: 1200,
        useNativeDriver: false,
      })
    ]).start();
  }, [budgetPercent, taskProgressPercent, currentWorkspace?.id]);

  if (!currentWorkspace) {
    return <WorkspaceSwitcher />;
  }

  // Countdown calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const weddingDate = new Date(currentWorkspace.weddingDate || todayDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = weddingDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let countdownText = '';
  if (diffDays > 0) {
    countdownText = `${diffDays} Days to go`;
  } else if (diffDays === 0) {
    countdownText = `Today is the big day! 💍🎉`;
  } else {
    countdownText = `Married for ${Math.abs(diffDays)} days! ❤️`;
  }

  // 3. Notifications / Activities
  const notifications = notificationsData?.notifications || [];
  const invites = invitesData?.invitations || [];
  const hasUnread = notifications.some((n) => !n.read_status) || invites.length > 0;

  // 4. Member Spending (Dynamic only)
  const expenses = expensesData?.expenses || [];
  let memberSpending: { name: string; amount: number }[] = [];
  if (expenses.length > 0) {
    const memberSpentMap: { [name: string]: number } = {};
    expenses.forEach((exp) => {
      const creator = exp.creator_name || 'Owner';
      memberSpentMap[creator] = (memberSpentMap[creator] || 0) + Number(exp.amount);
    });
    memberSpending = Object.keys(memberSpentMap)
      .map((name) => ({ name, amount: memberSpentMap[name] }))
      .sort((a, b) => b.amount - a.amount);
  }
  const maxMemberSpent = Math.max(...memberSpending.map((m) => m.amount), 1);

  // 5. Category Spending (Dynamic only)
  let categorySpending: { name: string; amount: number; percent?: number }[] = [];
  if (expenses.length > 0) {
    const categorySpentMap: { [name: string]: number } = {};
    expenses.forEach((exp) => {
      const category = exp.category_name || 'Uncategorized';
      categorySpentMap[category] = (categorySpentMap[category] || 0) + Number(exp.amount);
    });
    categorySpending = Object.keys(categorySpentMap)
      .map((name) => ({ name, amount: categorySpentMap[name] }))
      .sort((a, b) => b.amount - a.amount);
  }
  const totalCategorySpent = categorySpending.reduce((sum, item) => sum + item.amount, 0) || 1;

  // 6. Events listing ratio mapping
  const dbEvents = eventsData?.events || [];
  const selectedEvent = dbEvents.find((e) => e.id === selectedEventId);
  const eventsList = dbEvents.map((evt) => {
    const evtTasks = tasks.filter((t) => t.event_id === evt.id);
    const total = evtTasks.length;
    const completed = evtTasks.filter((t) => t.status === 'Completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      id: evt.id,
      title: evt.title,
      date: safeFormatDate(evt.start_time, { day: 'numeric', month: 'short' }),
      tasksRatio: `${completed}/${total}`,
      percent,
    };
  });

  const handleMarkAllRead = async () => {
    try {
      await markAsReadMutation.mutateAsync({});
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const isDataLoading = budgetLoading || expensesLoading || tasksLoading || notificationsLoading || eventsLoading;

  const formattedWeddingDateStr = safeFormatDate(currentWorkspace.weddingDate || todayDateStr, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* TOP HEADER CARD (Deep Maroon, Wedding Theme) */}
          <View style={[styles.weddingHeaderCard, { backgroundColor: '#5D0921' }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => setCurrentWorkspace(null)} style={styles.headerIconBtn}>
                <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <ThemedText style={styles.headerTitle}>{currentWorkspace.name}</ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  {formattedWeddingDateStr} — {countdownText}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationsTray(true)} style={styles.headerIconBtn}>
                <Ionicons name="notifications" size={22} color="#FFFFFF" />
                {hasUnread && <View style={styles.unreadHeaderBadge} />}
              </TouchableOpacity>
            </View>

            {/* Centered Wedding Arch Mandap Illustration */}
            <View style={styles.mandapIllustrationWrapper}>
              {(currentWorkspace as any).cover_image_url ? (
                <Image
                  source={{ uri: resolveFileUrl((currentWorkspace as any).cover_image_url) }}
                  style={styles.mandapIllustration}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require('@/assets/images/wedding_banner.png')}
                  style={styles.mandapIllustration}
                  resizeMode="cover"
                />
              )}
              {(currentWorkspace.role === 'OWNER' || currentWorkspace.role === 'EDITOR') && (
                <TouchableOpacity
                  style={(styles as any).editCoverBtn}
                  onPress={handleUpdateCoverImage}
                  disabled={isUpdatingCover}
                  activeOpacity={0.7}
                >
                  {isUpdatingCover ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isDataLoading && (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator color="#5D0921" size="small" />
            </ThemedView>
          )}

          {/* 1. Widget: Budget Summary */}
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.widgetHeaderRow}
              onPress={() => router.push('/expenses')}
              activeOpacity={0.7}
            >
              <ThemedText type="smallBold" style={[styles.widgetTitle, { color: theme.text }]}>Total Budget</ThemedText>
              <View style={styles.viewAllRow}>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold', fontSize: 12 }}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#E91E63" />
              </View>
            </TouchableOpacity>
            <ThemedText style={[styles.largeBudgetValue, { color: theme.text }]}>
              {allocated > 0 ? `₹${allocated.toLocaleString('en-IN')}` : 'No Budget Set'}
            </ThemedText>
            
            {allocated > 0 ? (
              <>
                {/* Split Progress Bar (Pink for Spent, Green for Remaining) */}
                <View style={styles.splitProgressBarBg}>
                  <Animated.View
                    style={[
                      styles.splitProgressBarSpent,
                      {
                        width: budgetAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        })
                      }
                    ]}
                  />
                </View>

                <View style={styles.budgetLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                    <ThemedText type="small" style={[styles.legendLabel, { color: theme.textSecondary }]}>Spent</ThemedText>
                    <ThemedText type="smallBold" style={[styles.legendValue, { color: theme.text }]}>
                      ₹{totalSpent.toLocaleString('en-IN')} ({budgetPercent}%)
                    </ThemedText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <ThemedText type="small" style={[styles.legendLabel, { color: theme.textSecondary }]}>Remaining</ThemedText>
                    <ThemedText type="smallBold" style={[styles.legendValue, { color: '#4CAF50' }]}>
                      ₹{remaining.toLocaleString('en-IN')} ({Math.max(100 - budgetPercent, 0)}%)
                    </ThemedText>
                  </View>
                </View>
              </>
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                Define your wedding budget allocation in the Expenses tab.
              </ThemedText>
            )}
          </ThemedView>

          <View style={styles.sectionWrapper}>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => router.push('/more?tab=EVENTS')}
              activeOpacity={0.7}
            >
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>Events Progress</ThemedText>
              <View style={styles.viewAllRow}>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold', fontSize: 12 }}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#E91E63" />
              </View>
            </TouchableOpacity>
            
            {eventsList.length === 0 ? (
              <View style={[styles.emptyWidgetState, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} />
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  No wedding events added yet. Set them up under {"More > Events"}.
                </ThemedText>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScrollView}>
                {eventsList.map((evt) => (
                  <TouchableOpacity
                    key={evt.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedEventId(evt.id)}
                  >
                    <View
                      style={[
                        styles.eventProgressCard,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.border }
                      ]}
                    >
                      <ThemedText type="smallBold" style={[styles.eventCardTitle, { color: theme.text }]}>{evt.title}</ThemedText>
                      <ThemedText type="small" style={[styles.eventCardDate, { color: theme.textSecondary }]}>{evt.date}</ThemedText>
                      <ThemedText type="small" style={[styles.eventCardRatio, { color: theme.textSecondary }]}>{evt.tasksRatio} Tasks</ThemedText>
                      
                      {/* Circle progress ring simulation */}
                      <View style={styles.circularIndicatorWrapper}>
                        <View style={[styles.circleIndicatorBorder, { borderColor: theme.text, backgroundColor: theme.backgroundSelected }]}>
                          <ThemedText type="smallBold" style={[styles.circleIndicatorText, { color: theme.text }]}>{evt.percent}%</ThemedText>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 3. Widget: Tasks Progress */}
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.widgetHeaderRow}
              onPress={() => router.push('/tasks')}
              activeOpacity={0.7}
            >
              <ThemedText type="smallBold" style={[styles.widgetTitle, { color: theme.text }]}>Tasks Progress</ThemedText>
              <View style={styles.viewAllRow}>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold', fontSize: 12 }}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#E91E63" />
              </View>
            </TouchableOpacity>
            
            {totalTasks > 0 ? (
              <>
                <View style={styles.tasksSummaryRow}>
                  <ThemedText type="default" style={[styles.tasksProgressLabel, { color: theme.textSecondary }]}>Completed</ThemedText>
                  <ThemedText type="smallBold" style={[styles.tasksProgressValue, { color: '#4CAF50' }]}>
                    {completedTasks}/{totalTasks} ({taskProgressPercent}%)
                  </ThemedText>
                </View>
                
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: tasksAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: '#4CAF50',
                      },
                    ]}
                  />
                </View>
              </>
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                No tasks available. Add checklists in the Tasks tab!
              </ThemedText>
            )}
          </ThemedView>

          {/* 4. Widget: Top Expense Categories */}
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.widgetHeaderRow}
              onPress={() => router.push('/expenses')}
              activeOpacity={0.7}
            >
              <ThemedText type="smallBold" style={[styles.widgetTitle, { color: theme.text }]}>Top Expense Categories</ThemedText>
              <View style={styles.viewAllRow}>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold', fontSize: 12 }}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#E91E63" />
              </View>
            </TouchableOpacity>
            
            {categorySpending.length === 0 ? (
              <View style={[styles.emptyWidgetState, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons name="pie-chart-outline" size={24} color={theme.textSecondary} style={{ marginBottom: 4 }} />
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  No logged expenses yet. Tap the center "+" tab button to add your first expense!
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Custom Proportion Stacked Segment Bar */}
                <View style={styles.stackedSegmentBar}>
                  {categorySpending.map((cat, idx) => {
                    const itemPercent = cat.percent || Math.round((cat.amount / totalCategorySpent) * 100);
                    if (itemPercent <= 0) return null;
                    return (
                      <View
                        key={cat.name}
                        style={{
                          width: `${itemPercent}%`,
                          backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          height: 14,
                        }}
                      />
                    );
                  })}
                </View>

                {/* List breakdown */}
                <View style={styles.categorySpendingList}>
                  {categorySpending.map((cat, idx) => {
                    const itemPercent = cat.percent || Math.round((cat.amount / totalCategorySpent) * 100);
                    return (
                      <View key={cat.name} style={styles.categorySpendingRow}>
                        <View style={styles.categoryLeft}>
                          <View style={[styles.colorIndicatorDot, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }]} />
                          <ThemedText type="smallBold" style={[styles.categoryNameText, { color: theme.text }]}>{cat.name}</ThemedText>
                        </View>
                        <ThemedText type="small" style={[styles.categoryPercentText, { color: theme.textSecondary }]}>{itemPercent}%</ThemedText>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ThemedView>

          {/* 5. Widget: Member Spending Summary */}
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.widgetHeaderRow}
              onPress={() => router.push('/expenses')}
              activeOpacity={0.7}
            >
              <ThemedText type="smallBold" style={[styles.widgetTitle, { color: theme.text }]}>Member Spending Summary</ThemedText>
              <View style={styles.viewAllRow}>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold', fontSize: 12 }}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#E91E63" />
              </View>
            </TouchableOpacity>
            
            {memberSpending.length === 0 ? (
              <View style={[styles.emptyWidgetState, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons name="people-outline" size={24} color={theme.textSecondary} style={{ marginBottom: 4 }} />
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  No logged transactions.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.memberSpendingList}>
                {memberSpending.map((member) => {
                  const proportion = member.amount / maxMemberSpent;
                  const initials = member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  
                  return (
                    <View key={member.name} style={styles.memberSpendingRow}>
                      {/* User Profile Avatar with Initials */}
                      <View style={[styles.memberAvatar, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }]}>
                        <ThemedText type="smallBold" style={[styles.avatarText, { color: theme.text }]}>{initials}</ThemedText>
                      </View>
                      
                      <View style={styles.memberProgressWrapper}>
                        <View style={styles.memberNameRow}>
                          <ThemedText type="smallBold" style={[styles.memberName, { color: theme.text }]}>{member.name}</ThemedText>
                          <ThemedText type="smallBold" style={[styles.memberAmount, { color: theme.text }]}>
                            ₹{member.amount.toLocaleString('en-IN')}
                          </ThemedText>
                        </View>
                        
                        {/* Bar indicator */}
                        <View style={styles.memberBarBg}>
                          <View
                            style={[
                              styles.memberBarFill,
                              {
                                width: `${Math.max(proportion * 100, 5)}%`,
                                backgroundColor: theme.text,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ThemedView>

          {/* Footer Info */}
          <ThemedView style={styles.footer}>
            <ThemedText type="small" style={[styles.footerText, { color: theme.textSecondary }]}>
              ShadiSync Wedding Sync Planner • Workspace Role: {currentWorkspace.role}
            </ThemedText>
          </ThemedView>
        </ScrollView>

        {/* Event Details Modal */}
        <Modal
          visible={!!selectedEventId}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setSelectedEventId(null);
            setIsEditingEvent(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={[styles.modalCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  {isEditingEvent ? 'Edit Event' : (selectedEvent?.title || 'Event Details')}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                  {(currentWorkspace.role === 'OWNER' || currentWorkspace.role === 'EDITOR') && !isEditingEvent && (
                    <TouchableOpacity onPress={startEditingEvent} style={styles.modalCloseBtn}>
                      <Ionicons name="create-outline" size={20} color={theme.text} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => { setSelectedEventId(null); setIsEditingEvent(false); }} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {isEditingEvent ? (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: Spacing.three, paddingBottom: 10 }}>
                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Title</ThemedText>
                      <TextInput
                        style={{ backgroundColor: theme.backgroundSelected, color: theme.text, height: 40, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                        value={eventTitle}
                        onChangeText={setEventTitle}
                        placeholder="e.g. Reception Dinner"
                        placeholderTextColor={theme.textSecondary}
                      />
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Description</ThemedText>
                      <TextInput
                        style={{ backgroundColor: theme.backgroundSelected, color: theme.text, minHeight: 60, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.border }}
                        value={eventDescription}
                        onChangeText={setEventDescription}
                        placeholder="Provide details about the event..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        numberOfLines={3}
                      />
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Start Time</ThemedText>
                      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: theme.backgroundSelected, height: 40, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                          onPress={() => setShowStartPicker('date')}
                        >
                          <ThemedText style={{ color: theme.text }}>
                            {eventStartTime ? new Date(eventStartTime).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Select Date'}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: theme.backgroundSelected, height: 40, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                          onPress={() => setShowStartPicker('time')}
                        >
                          <ThemedText style={{ color: theme.text }}>
                            {eventStartTime ? new Date(eventStartTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      {showStartPicker === 'date' && (
                        <DateTimePicker
                          value={eventStartTime ? new Date(eventStartTime) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(e: any, date?: Date) => {
                            setShowStartPicker('none');
                            if (date) {
                              const current = eventStartTime ? new Date(eventStartTime) : new Date();
                              current.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                              setEventStartTime(current.toISOString());
                            }
                          }}
                        />
                      )}
                      {showStartPicker === 'time' && (
                        <DateTimePicker
                          value={eventStartTime ? new Date(eventStartTime) : new Date()}
                          mode="time"
                          display="default"
                          onChange={(e: any, time?: Date) => {
                            setShowStartPicker('none');
                            if (time) {
                              const current = eventStartTime ? new Date(eventStartTime) : new Date();
                              current.setHours(time.getHours(), time.getMinutes());
                              setEventStartTime(current.toISOString());
                            }
                          }}
                        />
                      )}
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">End Time</ThemedText>
                      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: theme.backgroundSelected, height: 40, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                          onPress={() => setShowEndPicker('date')}
                        >
                          <ThemedText style={{ color: theme.text }}>
                            {eventEndTime ? new Date(eventEndTime).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Select Date'}
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: theme.backgroundSelected, height: 40, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                          onPress={() => setShowEndPicker('time')}
                        >
                          <ThemedText style={{ color: theme.text }}>
                            {eventEndTime ? new Date(eventEndTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      {showEndPicker === 'date' && (
                        <DateTimePicker
                          value={eventEndTime ? new Date(eventEndTime) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(e: any, date?: Date) => {
                            setShowEndPicker('none');
                            if (date) {
                              const current = eventEndTime ? new Date(eventEndTime) : new Date();
                              current.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                              setEventEndTime(current.toISOString());
                            }
                          }}
                        />
                      )}
                      {showEndPicker === 'time' && (
                        <DateTimePicker
                          value={eventEndTime ? new Date(eventEndTime) : new Date()}
                          mode="time"
                          display="default"
                          onChange={(e: any, time?: Date) => {
                            setShowEndPicker('none');
                            if (time) {
                              const current = eventEndTime ? new Date(eventEndTime) : new Date();
                              current.setHours(time.getHours(), time.getMinutes());
                              setEventEndTime(current.toISOString());
                            }
                          }}
                        />
                      )}
                    </ThemedView>

                    <ThemedView style={styles.inputWrapper}>
                      <ThemedText type="smallBold">Location</ThemedText>
                      <TextInput
                        style={{ backgroundColor: theme.backgroundSelected, color: theme.text, height: 40, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border }}
                        value={eventLocation}
                        onChangeText={setEventLocation}
                        placeholder="Venue location..."
                        placeholderTextColor={theme.textSecondary}
                      />
                    </ThemedView>

                    <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two }}>
                      <TouchableOpacity
                        style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: '#E91E63', alignItems: 'center', justifyContent: 'center' }}
                        onPress={handleSaveEvent}
                        disabled={updateEventMutation.isPending}
                      >
                        {updateEventMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <ThemedText style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save</ThemedText>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' }}
                        onPress={handleDeleteEvent}
                        disabled={deleteEventMutation.isPending}
                      >
                        {deleteEventMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <ThemedText style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Delete</ThemedText>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, height: 40, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setIsEditingEvent(false)}
                      >
                        <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Details Section */}
                  <View style={styles.modalDetailsSection}>
                    <View style={styles.modalDetailItem}>
                      <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(233, 30, 99, 0.08)' }]}>
                        <Ionicons name="calendar-outline" size={18} color="#E91E63" />
                      </View>
                      <View style={styles.modalDetailTextWrapper}>
                        <ThemedText type="smallBold" style={{ color: theme.text }}>Date & Time</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {selectedEvent?.start_time ? safeFormatDate(selectedEvent.start_time, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          } as any) : 'N/A'}
                          {selectedEvent?.end_time ? ` to ${safeFormatDate(selectedEvent.end_time, {
                            hour: '2-digit',
                            minute: '2-digit'
                          } as any)}` : ''}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.modalDetailItem}>
                      <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(76, 175, 80, 0.08)' }]}>
                        <Ionicons name="location-outline" size={18} color="#4CAF50" />
                      </View>
                      <View style={styles.modalDetailTextWrapper}>
                        <ThemedText type="smallBold" style={{ color: theme.text }}>Location</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {selectedEvent?.location || 'No location specified'}
                        </ThemedText>
                      </View>
                    </View>

                    {selectedEvent?.description && (
                      <View style={styles.modalDetailItem}>
                        <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(63, 81, 181, 0.08)' }]}>
                          <Ionicons name="information-circle-outline" size={18} color="#3F51B5" />
                        </View>
                        <View style={styles.modalDetailTextWrapper}>
                          <ThemedText type="smallBold" style={{ color: theme.text }}>Description</ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {selectedEvent.description}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.modalDivider} />

                  {/* Event Tasks checklist */}
                  <View style={styles.modalTasksSection}>
                    <ThemedText type="smallBold" style={[styles.modalSectionHeader, { color: theme.text }]}>
                      Tasks ({tasks.filter(t => t.event_id === selectedEventId && t.status === 'Completed').length}/{tasks.filter(t => t.event_id === selectedEventId).length} Completed)
                    </ThemedText>

                    {tasks.filter((t) => t.event_id === selectedEventId).length === 0 ? (
                      <ThemedText type="small" style={[styles.modalEmptyTasks, { color: theme.textSecondary }]}>
                        No tasks associated with this event.
                      </ThemedText>
                    ) : (
                      tasks.filter((t) => t.event_id === selectedEventId).map((task) => (
                        <View key={task.id} style={styles.modalTaskRow}>
                          <Ionicons
                            name={task.status === 'Completed' ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={task.status === 'Completed' ? '#4CAF50' : theme.textSecondary}
                          />
                          <ThemedText
                            type="small"
                            style={[
                              styles.modalTaskTitle,
                              {
                                color: theme.text,
                                textDecorationLine: task.status === 'Completed' ? 'line-through' : 'none',
                                opacity: task.status === 'Completed' ? 0.6 : 1
                              }
                            ]}
                            numberOfLines={2}
                          >
                            {task.title}
                          </ThemedText>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}
            </ThemedView>
          </View>
        </Modal>

        {/* Quick Actions FAB */}
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: '#E91E63' }]}
          onPress={() => setShowQuickActions(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Quick Actions Modal Overlay */}
        <Modal
          visible={showQuickActions}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowQuickActions(false)}
        >
          <TouchableOpacity
            style={styles.quickActionsOverlay}
            activeOpacity={1}
            onPress={() => setShowQuickActions(false)}
          >
            <ThemedView type="backgroundElement" style={[styles.quickActionsCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <View style={styles.quickActionsHeader}>
                <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.text }}>Quick Actions</ThemedText>
                <TouchableOpacity onPress={() => setShowQuickActions(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.quickActionsList}>
                <TouchableOpacity
                  style={[styles.quickActionItem, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setShowQuickActions(false);
                    router.push('/expenses?action=create');
                  }}
                >
                  <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(233, 30, 99, 0.1)' }]}>
                    <Ionicons name="wallet-outline" size={22} color="#E91E63" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>Log Expense</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>Record wedding spending & receipts</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionItem, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setShowQuickActions(false);
                    router.push('/tasks?action=create');
                  }}
                >
                  <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                    <Ionicons name="checkbox-outline" size={22} color="#4CAF50" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>Add Checklist Task</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>Create tracking item for wedding planner</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionItem, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setShowQuickActions(false);
                    router.push('/more?tab=EVENTS&action=create');
                  }}
                >
                  <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(63, 81, 181, 0.1)' }]}>
                    <Ionicons name="calendar-outline" size={22} color="#3F51B5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: theme.text }}>Schedule Event</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>Add wedding timeline itinerary slot</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableOpacity>
        </Modal>

        {/* Notifications and Invitations Tray Modal */}
        <Modal
          visible={showNotificationsTray}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNotificationsTray(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowNotificationsTray(false)}
          >
            <ThemedView
              type="backgroundElement"
              style={[
                styles.modalCard,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement, maxHeight: '80%' },
              ]}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={[styles.modalTitle, { color: theme.text }]}>
                  Inbox & Invites
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setShowNotificationsTray(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Tabs selector */}
              <View style={styles.trayTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.trayTab,
                    notificationsActiveTab === 'notifications' && { borderBottomColor: '#E91E63', borderBottomWidth: 2 },
                  ]}
                  onPress={() => setNotificationsActiveTab('notifications')}
                >
                  <ThemedText
                    style={{
                      fontWeight: 'bold',
                      fontSize: 13,
                      color: notificationsActiveTab === 'notifications' ? '#E91E63' : theme.textSecondary,
                    }}
                  >
                    Notifications ({notifications.length})
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.trayTab,
                    notificationsActiveTab === 'invitations' && { borderBottomColor: '#E91E63', borderBottomWidth: 2 },
                  ]}
                  onPress={() => setNotificationsActiveTab('invitations')}
                >
                  <ThemedText
                    style={{
                      fontWeight: 'bold',
                      fontSize: 13,
                      color: notificationsActiveTab === 'invitations' ? '#E91E63' : theme.textSecondary,
                    }}
                  >
                    Invitations ({invites.length})
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {notificationsActiveTab === 'notifications' ? (
                  notifications.length === 0 ? (
                    <View style={styles.trayEmptyState}>
                      <Ionicons name="mail-open-outline" size={40} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 10 }}>
                        Your inbox is empty
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
                      {/* Mark all as read link */}
                      {notifications.some((n) => !n.read_status) && (
                        <TouchableOpacity onPress={handleMarkAllRead} style={{ alignSelf: 'flex-end', paddingRight: Spacing.one }}>
                          <ThemedText style={{ color: '#E91E63', fontSize: 12, fontWeight: 'bold' }}>
                            Mark all as read
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                      {notifications.map((n) => (
                        <View
                          key={n.id}
                          style={[
                            styles.trayItemCard,
                            { backgroundColor: theme.backgroundSelected },
                            !n.read_status && { borderLeftColor: '#E91E63', borderLeftWidth: 3 },
                          ]}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <ThemedText type="smallBold" style={{ color: theme.text }}>
                              {n.title}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: theme.textSecondary }}>
                              {n.message}
                            </ThemedText>
                            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>
                              {new Date(n.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </ThemedText>
                          </View>
                        </View>
                      ))}
                    </View>
                  )
                ) : invites.length === 0 ? (
                  <View style={styles.trayEmptyState}>
                    <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 10 }}>
                      No workspace invitations pending
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: Spacing.two, paddingBottom: Spacing.four }}>
                    {invites.map((invite) => (
                      <View
                        key={invite.id}
                        style={[styles.trayItemCard, { backgroundColor: theme.backgroundSelected, gap: Spacing.two }]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <ThemedText type="smallBold" style={{ color: theme.text }}>
                            Workspace Invite
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            You have been invited to join the wedding workspace:
                          </ThemedText>
                          <ThemedText type="smallBold" style={{ color: theme.text, fontSize: 14, marginVertical: 4 }}>
                            {invite.workspace_name || 'Wedding Workspace'}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
                            Role: {invite.role} • Invited by: {invite.inviter_name || 'Owner'}
                          </ThemedText>
                        </View>

                        {/* Inline Actions */}
                        <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }}>
                          <TouchableOpacity
                            style={[styles.trayActionBtn, { backgroundColor: '#4CAF50' }]}
                            onPress={async () => {
                              try {
                                await respondInviteMutation.mutateAsync({ id: invite.id, action: 'ACCEPT' });
                                showToast('Success', 'Accepted invitation!', 'success');
                                refetchInvites();
                              } catch (err: any) {
                                showToast('Error', err.message || 'Failed to accept invitation', 'error');
                              }
                            }}
                          >
                            <ThemedText style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                              Accept
                            </ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.trayActionBtn, { backgroundColor: '#ff3b30' }]}
                            onPress={async () => {
                              try {
                                await respondInviteMutation.mutateAsync({ id: invite.id, action: 'REJECT' });
                                showToast('Success', 'Declined invitation', 'success');
                                refetchInvites();
                              } catch (err: any) {
                                showToast('Error', err.message || 'Failed to decline invitation', 'error');
                              }
                            }}
                          >
                            <ThemedText style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                              Decline
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  loadingContainer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  weddingHeaderCard: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadHeaderBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E91E63',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.two,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  mandapIllustrationWrapper: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mandapIllustration: {
    width: '100%',
    height: '100%',
  },
  card: {
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EADFD9',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: 'bold',
  },
  largeBudgetValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  splitProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    overflow: 'hidden',
    marginTop: 4,
  },
  splitProgressBarSpent: {
    height: '100%',
    backgroundColor: '#E91E63',
  },
  budgetLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  legendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  legendValue: {
    fontSize: 11,
  },
  sectionWrapper: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventsScrollView: {
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
    gap: Spacing.three,
  },
  eventProgressCard: {
    padding: Spacing.three,
    borderRadius: 14,
    width: 130,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eventCardDate: {
    fontSize: 11,
  },
  eventCardRatio: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  circularIndicatorWrapper: {
    marginTop: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIndicatorBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIndicatorText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tasksSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  tasksProgressLabel: {
    fontSize: 14,
  },
  tasksProgressValue: {
    fontSize: 16,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stackedSegmentBar: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    flexDirection: 'row',
    marginVertical: Spacing.two,
  },
  categorySpendingList: {
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  categorySpendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryNameText: {
    fontSize: 13,
  },
  categoryPercentText: {
    fontSize: 13,
  },
  memberSpendingList: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  memberSpendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 12,
  },
  memberProgressWrapper: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
  },
  memberAmount: {
    fontSize: 13,
  },
  memberBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  memberBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerText: {
    fontSize: 11,
  },
  emptyWidgetState: {
    padding: Spacing.four,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 100,
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.one,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: Spacing.two,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalDetailsSection: {
    gap: Spacing.three,
  },
  modalDetailItem: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetailTextWrapper: {
    flex: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: Spacing.four,
  },
  modalTasksSection: {
    gap: Spacing.two,
  },
  modalSectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  modalEmptyTasks: {
    fontStyle: 'italic',
    paddingLeft: Spacing.one,
  },
  modalTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 6,
  },
  modalTaskTitle: {
    flex: 1,
  },
  fabButton: {
    position: 'absolute',
    bottom: Spacing.four + 64,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 999,
  },
  quickActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  quickActionsCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  quickActionsList: {
    gap: Spacing.three,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.three,
  },
  quickActionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCoverBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trayTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    marginBottom: Spacing.three,
  },
  trayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  trayEmptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  trayItemCard: {
    padding: Spacing.three,
    borderRadius: 12,
    gap: 4,
  },
  trayActionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
