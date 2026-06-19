import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToastStore } from '@/stores/toastStore';
import { safeFormatDate } from '@/utils/date';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkspaceGuard } from '@/components/workspaces/WorkspaceGuard';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useTasks,
  useWorkspaceMembers,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  TaskItem,
} from '@/hooks/useTasks';
import { useEvents, useCategories } from '@/hooks/useEventsAndCategories';
import { hasPermission } from '@/utils/permissions';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import AttachmentSection from '@/components/attachments/AttachmentSection';

export default function TasksScreen() {
  const theme = useTheme();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const currentUser = useAuthStore((state) => state.user);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: tasksData, isLoading, isError, refetch } = useTasks(currentWorkspace?.id);
  const { data: membersData } = useWorkspaceMembers(currentWorkspace?.id);
  const { data: eventsData } = useEvents(currentWorkspace?.id);
  const { data: categoriesData } = useCategories(currentWorkspace?.id);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const { showToast } = useToastStore();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Mode States: 'LIST' | 'CREATE' | 'EDIT'
  const [mode, setMode] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    if (params.action === 'create') {
      setMode('CREATE');
      router.setParams({ action: undefined });
    }
  }, [params.action]);

  // List filters
  const [selectedFilterTab, setSelectedFilterTab] = useState<'My Tasks' | 'All' | 'Completed'>('All');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [eventId, setEventId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('Pending');
    setPriority('Medium');
    setAssignedTo('');
    setDueDate('');
    setEventId('');
    setCategoryId('');
    setSelectedTask(null);
    setShowDatePicker(false);
  };

  const handleCreate = async () => {
    if (!currentWorkspace) return;
    if (title.trim().length === 0) {
      showToast('Validation Error', 'Task title is required', 'error');
      return;
    }

    try {
      await createMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
        eventId: eventId || undefined,
        categoryId: categoryId || undefined,
      });
      showToast('Success', 'Task created successfully', 'success');
      setMode('LIST');
      resetForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create task', 'error');
    }
  };

  const handleEdit = (task: TaskItem) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setAssignedTo(task.assigned_to || '');
    setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setEventId(task.event_id || '');
    setCategoryId(task.category_id || '');
    setMode('EDIT');
  };

  const handleUpdate = async () => {
    if (!currentWorkspace || !selectedTask) return;
    if (title.trim().length === 0) {
      showToast('Validation Error', 'Task title is required', 'error');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedTask.id,
        workspaceId: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
        eventId: eventId || undefined,
        categoryId: categoryId || undefined,
      });
      showToast('Success', 'Task updated successfully', 'success');
      setMode('LIST');
      resetForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update task', 'error');
    }
  };

  // Completion workflow: Quick Toggle Completed
  const handleToggleCompleted = async (task: TaskItem) => {
    if (!currentWorkspace) return;
    const targetStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        workspaceId: currentWorkspace.id,
        title: task.title,
        description: task.description || undefined,
        status: targetStatus,
        priority: task.priority,
        assignedTo: task.assigned_to || undefined,
        dueDate: task.due_date ? task.due_date.split('T')[0] : undefined,
        eventId: task.event_id || undefined,
        categoryId: task.category_id || undefined,
      });
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update task status', 'error');
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!currentWorkspace) return;
    try {
      await deleteMutation.mutateAsync({
        id: task.id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Task deleted successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete task', 'error');
    }
  };

  // Redesign Priority badge style matching mockup
  const renderPriorityBadge = (p: 'Low' | 'Medium' | 'High') => {
    let bgColor = 'rgba(76, 175, 80, 0.08)';
    let textColor = '#4CAF50';
    if (p === 'High') {
      bgColor = 'rgba(244, 67, 54, 0.08)';
      textColor = '#F44336';
    } else if (p === 'Medium') {
      bgColor = 'rgba(255, 152, 0, 0.08)';
      textColor = '#FF9800';
    }
    return (
      <View style={[styles.priorityBadge, { backgroundColor: bgColor }]}>
        <ThemedText style={{ color: textColor, fontSize: 10, fontWeight: 'bold' }}>
          {p}
        </ThemedText>
      </View>
    );
  };

  const tasks = tasksData?.tasks || [];
  const members = membersData?.members || [];
  const events = eventsData?.events || [];
  const categories = categoriesData?.categories || [];
  const canCreate = hasPermission(currentWorkspace?.role, 'Tasks', 'create');
  const canEdit = hasPermission(currentWorkspace?.role, 'Tasks', 'edit');

  // Stats Counters
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const pendingCount = totalCount - completedCount;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(
    (t) => t.status !== 'Completed' && t.due_date && t.due_date.split('T')[0] < todayStr
  ).length;

  // Filter Tasks list
  let filteredTasks = [...tasks];
  if (selectedFilterTab === 'My Tasks') {
    filteredTasks = tasks.filter(
      (t) => t.assigned_to === currentUser?.id
    );
  } else if (selectedFilterTab === 'Completed') {
    filteredTasks = tasks.filter((t) => t.status === 'Completed');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <WorkspaceGuard currentWorkspace={currentWorkspace}>
          {isLoading ? (
            <ThemedView style={styles.center}>
              <ActivityIndicator size="large" color="#5D0921" />
            </ThemedView>
          ) : isError ? (
            <ThemedView style={styles.center}>
              <ThemedText>Error loading tasks.</ThemedText>
              <TouchableOpacity style={styles.button} onPress={() => refetch()}>
                <ThemedText style={{ color: theme.background }}>Retry</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : mode === 'CREATE' || mode === 'EDIT' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <ThemedText type="smallBold" style={styles.formTitle}>
                {mode === 'EDIT' ? (canEdit ? 'Edit Task' : 'Task Details') : 'Create Task'}
              </ThemedText>

              <ThemedView style={styles.form}>
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Task Title</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Confirm wedding cake design"
                    placeholderTextColor={theme.textSecondary}
                    editable={mode === 'EDIT' ? canEdit : true}
                  />
                </ThemedView>

                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Description</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter details..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={3}
                    editable={mode === 'EDIT' ? canEdit : true}
                  />
                </ThemedView>

                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Priority</ThemedText>
                  <ThemedView style={styles.rowSelector}>
                    {['Low', 'Medium', 'High'].map((p: any) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.selectorBtn,
                          {
                            backgroundColor: priority === p ? theme.text : theme.backgroundSelected,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => {
                          if (mode === 'CREATE' || canEdit) setPriority(p);
                        }}
                        disabled={mode === 'EDIT' && !canEdit}
                      >
                        <ThemedText style={{ color: priority === p ? theme.background : theme.text, fontSize: 13 }}>
                          {p}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>

                {mode === 'EDIT' && (
                  <ThemedView style={styles.inputWrapper}>
                    <ThemedText type="smallBold">Status</ThemedText>
                    <ThemedView style={styles.rowSelector}>
                      {['Pending', 'In Progress', 'Completed'].map((s: any) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.selectorBtn,
                            {
                              backgroundColor: status === s ? theme.text : theme.backgroundSelected,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => {
                            if (canEdit) setStatus(s);
                          }}
                          disabled={!canEdit}
                        >
                          <ThemedText style={{ color: status === s ? theme.background : theme.text, fontSize: 13 }}>
                            {s}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ThemedView>
                  </ThemedView>
                )}

                {/* Assignment workflow */}
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Assign to Team Member</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        { backgroundColor: assignedTo === '' ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        if (mode === 'CREATE' || canEdit) setAssignedTo('');
                      }}
                      disabled={mode === 'EDIT' && !canEdit}
                    >
                      <ThemedText style={{ color: assignedTo === '' ? theme.background : theme.text, fontSize: 13 }}>
                        Unassigned
                      </ThemedText>
                    </TouchableOpacity>
                    {members.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.selectorBtn,
                          { backgroundColor: assignedTo === member.id ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                        ]}
                        onPress={() => {
                          if (mode === 'CREATE' || canEdit) setAssignedTo(member.id);
                        }}
                        disabled={mode === 'EDIT' && !canEdit}
                      >
                        <ThemedText style={{ color: assignedTo === member.id ? theme.background : theme.text, fontSize: 13 }}>
                          {member.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ThemedView>

                 <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Due Date</ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                        borderWidth: 1,
                        justifyContent: 'center',
                      },
                    ]}
                    onPress={() => {
                      if (mode === 'CREATE' || canEdit) setShowDatePicker(true);
                    }}
                    disabled={mode === 'EDIT' && !canEdit}
                  >
                    <ThemedText style={{ color: dueDate ? theme.text : theme.textSecondary }}>
                      {dueDate || 'Select Due Date (Default: None)'}
                    </ThemedText>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={(() => {
                        if (!dueDate) return new Date();
                        const parsed = Date.parse(dueDate);
                        return isNaN(parsed) ? new Date() : new Date(parsed);
                      })()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDueDate(selectedDate.toISOString().split('T')[0]);
                        }
                      }}
                      onDismiss={() => setShowDatePicker(false)}
                    />
                  )}
                </ThemedView>

                {/* Associated Event Selector */}
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Link to Event</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        { backgroundColor: eventId === '' ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        if (mode === 'CREATE' || canEdit) setEventId('');
                      }}
                      disabled={mode === 'EDIT' && !canEdit}
                    >
                      <ThemedText style={{ color: eventId === '' ? theme.background : theme.text, fontSize: 13 }}>
                        None
                      </ThemedText>
                    </TouchableOpacity>
                    {events.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.selectorBtn,
                          { backgroundColor: eventId === event.id ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                        ]}
                        onPress={() => {
                          if (mode === 'CREATE' || canEdit) setEventId(event.id);
                        }}
                        disabled={mode === 'EDIT' && !canEdit}
                      >
                        <ThemedText style={{ color: eventId === event.id ? theme.background : theme.text, fontSize: 13 }}>
                          {event.title}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ThemedView>

                {/* Associated Category Selector */}
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Link to Category</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        { backgroundColor: categoryId === '' ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        if (mode === 'CREATE' || canEdit) setCategoryId('');
                      }}
                      disabled={mode === 'EDIT' && !canEdit}
                    >
                      <ThemedText style={{ color: categoryId === '' ? theme.background : theme.text, fontSize: 13 }}>
                        None
                      </ThemedText>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.selectorBtn,
                          { backgroundColor: categoryId === cat.id ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                        ]}
                        onPress={() => {
                          if (mode === 'CREATE' || canEdit) setCategoryId(cat.id);
                        }}
                        disabled={mode === 'EDIT' && !canEdit}
                      >
                        <ThemedText style={{ color: categoryId === cat.id ? theme.background : theme.text, fontSize: 13 }}>
                          {cat.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ThemedView>

                {(mode === 'CREATE' || canEdit) && (
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.text, marginTop: Spacing.two }]}
                    onPress={mode === 'EDIT' ? handleUpdate : handleCreate}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <ActivityIndicator color={theme.background} />
                    ) : (
                      <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                        {mode === 'EDIT' ? 'Save Changes' : 'Create Task'}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setMode('LIST');
                    resetForm();
                  }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>{canEdit || mode === 'CREATE' ? 'Cancel' : 'Go Back'}</ThemedText>
                </TouchableOpacity>

                {mode === 'EDIT' && selectedTask && (
                  <AttachmentSection entityType="TASK" entityId={selectedTask.id} readOnly={!canEdit} />
                )}
              </ThemedView>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* HEADER BAR (Hamburger, centered Title, Add/Filter icons) */}
              <View style={styles.appHeaderRow}>
                <TouchableOpacity onPress={() => setCurrentWorkspace(null)} style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <Ionicons name="menu-outline" size={24} color={theme.text} />
                </TouchableOpacity>
                <ThemedText type="title" style={[styles.screenCenterTitle, { color: theme.text }]}>Tasks</ThemedText>
                <View style={styles.headerRightActions}>
                  {canCreate && (
                    <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={() => setMode('CREATE')}>
                      <Ionicons name="add" size={22} color={theme.text} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Ionicons name="funnel-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* TASKS METRICS STATS BAR */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statNumber, { color: theme.text }]}>{totalCount}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Total</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>{completedCount}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statNumber, { color: '#FF9800' }]}>{pendingCount}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statNumber, { color: '#F44336' }]}>{overdueCount}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Overdue</ThemedText>
                </View>
              </View>

              {/* SEGMENT FILTER TABS */}
              <View style={styles.tabsContainer}>
                {(['My Tasks', 'All', 'Completed'] as const).map((tab) => {
                  const isSelected = selectedFilterTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.filterTabButton,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                        isSelected && { backgroundColor: theme.text }
                      ]}
                      onPress={() => setSelectedFilterTab(tab)}
                    >
                      <ThemedText
                        style={[
                          styles.filterTabLabel,
                          { color: isSelected ? theme.background : theme.textSecondary }
                        ]}
                      >
                        {tab === 'All' ? 'All Tasks' : tab}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ADD TASK FULL WIDTH BUTTON */}
              {canCreate && (
                <TouchableOpacity
                  style={[styles.logTaskFullButton, { backgroundColor: theme.text }]}
                  onPress={() => setMode('CREATE')}
                >
                  <ThemedText style={[styles.logTaskText, { color: theme.background }]}>+ Add Custom Task</ThemedText>
                </TouchableOpacity>
              )}

              {/* TASK LIST CARD ENTRIES */}
              <ThemedText type="smallBold" style={[styles.listHeaderTitle, { color: theme.text }]}>Active Checklist</ThemedText>

              {filteredTasks.length === 0 ? (
                <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>No Tasks Found</ThemedText>
                  <ThemedText type="default" style={[styles.placeholderText, { color: theme.textSecondary }]}>
                    Workspace checklist is currently empty. Add tasks to start tracking checklists.
                  </ThemedText>
                </ThemedView>
              ) : (
                <View style={styles.list}>
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === 'Completed';
                    const assigneeInitials = task.assignee_name
                      ? task.assignee_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'U';
                    
                    return (
                      <ThemedView key={task.id} type="backgroundElement" style={[styles.taskCard, { borderColor: theme.border }]}>
                        <View style={styles.taskCardMain}>
                          
                          {/* Circular Checkbox Toggle Button */}
                          <TouchableOpacity
                            style={[
                              styles.circularCheckbox,
                              {
                                borderColor: isCompleted ? '#4CAF50' : theme.border,
                                backgroundColor: isCompleted ? '#4CAF50' : theme.backgroundElement
                              }
                            ]}
                            onPress={() => {
                              if (canEdit) {
                                handleToggleCompleted(task);
                              } else {
                                showToast('Permission Denied', 'You do not have permission to modify task status', 'error');
                              }
                            }}
                          >
                            {isCompleted && (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>

                          {/* Task details wrapper */}
                          <TouchableOpacity
                            style={{ flex: 1, gap: 2 }}
                            onPress={() => handleEdit(task)}
                            activeOpacity={0.7}
                          >
                            <ThemedText
                              type="smallBold"
                              style={[
                                styles.taskTitle,
                                {
                                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                                  opacity: isCompleted ? 0.6 : 1,
                                  color: theme.text
                                },
                              ]}
                            >
                              {task.title}
                            </ThemedText>

                            {(task.event_title || task.category_name) && (
                              <ThemedText type="small" style={[styles.taskBreadcrumb, { color: theme.textSecondary }]}>
                                {task.category_name || 'Tasks'} {task.event_title ? `> ${task.event_title}` : ''}
                              </ThemedText>
                            )}

                            {task.description && (
                              <ThemedText type="small" style={[styles.taskDesc, { color: theme.textSecondary, opacity: isCompleted ? 0.4 : 0.7 }]}>
                                {task.description}
                              </ThemedText>
                            )}

                            {/* Assignee initials and due date */}
                            <View style={styles.assigneeDateRow}>
                              <View style={styles.assigneeAvatarWrapper}>
                                <View style={[styles.avatarCircle, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                                  <ThemedText style={[styles.avatarCircleText, { color: theme.text }]}>{assigneeInitials}</ThemedText>
                                </View>
                                <ThemedText type="small" style={[styles.assigneeNameText, { color: theme.textSecondary }]}>
                                  {task.assignee_name || 'Unassigned'}
                                </ThemedText>
                              </View>

                              {task.due_date && (
                                <View style={styles.dueDateBadge}>
                                  <Ionicons name="calendar-outline" size={11} color="#E91E63" />
                                  <ThemedText style={styles.dueDateText}>
                                    {safeFormatDate(task.due_date)}
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>

                          {/* Right Side: Priority Badge & Actions */}
                          <View style={styles.rightSideColumn}>
                            {renderPriorityBadge(task.priority)}
                            
                            <View style={styles.rowActionsBtn}>
                              <PermissionGuard module="Tasks" action="edit">
                                <TouchableOpacity onPress={() => handleEdit(task)} style={styles.actionIconBtn}>
                                  <Ionicons name="create-outline" size={16} color="#7C5C62" />
                                </TouchableOpacity>
                              </PermissionGuard>
                              <PermissionGuard module="Tasks" action="delete">
                                <TouchableOpacity onPress={() => handleDelete(task)} style={styles.actionIconBtn}>
                                  <Ionicons name="trash-outline" size={16} color="#F44336" />
                                </TouchableOpacity>
                              </PermissionGuard>
                            </View>
                          </View>
                        </View>
                      </ThemedView>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
          {mode === 'LIST' && canCreate && (
            <TouchableOpacity
              style={[styles.fabButton, { backgroundColor: '#E91E63' }]}
              onPress={() => setMode('CREATE')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </WorkspaceGuard>
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
  },
  scrollContent: {
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.one,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  screenCenterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  filterTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  filterTabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTaskFullButton: {
    marginHorizontal: Spacing.three,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#5D0921',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logTaskText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  placeholderText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  taskCardMain: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  circularCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 14,
  },
  taskBreadcrumb: {
    fontSize: 11,
    opacity: 0.5,
  },
  taskDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  assigneeDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  assigneeAvatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarCircleText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  assigneeNameText: {
    fontSize: 11,
    opacity: 0.6,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dueDateText: {
    fontSize: 11,
    color: '#E91E63',
    fontWeight: 'bold',
  },
  rightSideColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    minHeight: 52,
    gap: Spacing.one,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowActionsBtn: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  actionIconBtn: {
    padding: 2,
  },
  formTitle: {
    fontSize: 20,
    marginBottom: Spacing.two,
    marginHorizontal: Spacing.three,
    fontWeight: 'bold',
  },
  form: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  inputWrapper: {
    gap: Spacing.one,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    height: 72,
    paddingTop: Spacing.two,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  selectorBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  horizontalRow: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  button: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
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
});
