import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkspaceGuard } from '@/components/workspaces/WorkspaceGuard';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useBudget,
  useUpdateBudget,
  useExpensesList,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  ExpenseItem,
} from '@/hooks/useBudgetAndExpenses';
import { useEvents, useCategories } from '@/hooks/useEventsAndCategories';
import { hasPermission } from '@/utils/permissions';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import AttachmentSection from '@/components/attachments/AttachmentSection';

// Helper to get category icons
const getCategoryIcon = (categoryName?: string | null): string => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('venue')) return 'business-outline';
  if (name.includes('cater') || name.includes('food')) return 'restaurant-outline';
  if (name.includes('decor') || name.includes('flower')) return 'brush-outline';
  if (name.includes('photo') || name.includes('video')) return 'camera-outline';
  if (name.includes('invite') || name.includes('card')) return 'mail-outline';
  return 'gift-outline';
};

export default function ExpensesScreen() {
  const theme = useTheme();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: budgetData, isLoading: budgetLoading, isError: budgetError } = useBudget(currentWorkspace?.id);
  const { data: expensesData, isLoading: expensesLoading, isError: expensesError, refetch: refetchExpenses } = useExpensesList(currentWorkspace?.id);
  const { data: eventsData } = useEvents(currentWorkspace?.id);
  const { data: categoriesData } = useCategories(currentWorkspace?.id);

  const updateBudgetMutation = useUpdateBudget();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  // Screen modes: 'LIST' | 'CREATE' | 'EDIT' | 'DETAIL'
  const [mode, setMode] = useState<'LIST' | 'CREATE' | 'EDIT' | 'DETAIL'>('LIST');

  useEffect(() => {
    if (params.action === 'create') {
      setMode('CREATE');
      router.setParams({ action: undefined });
    }
  }, [params.action]);

  const { showToast } = useToastStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // List filters
  const [selectedFilterTab, setSelectedFilterTab] = useState<'All' | 'Unbilled' | 'By Category' | 'By Member'>('All');

  // Budget Edit States (Owner only)
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetAllocated, setNewBudgetAllocated] = useState('');

  // Expense Form States
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  const resetExpenseForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategoryId('');
    setSelectedEventId('');
    setExpenseDate('');
    setSelectedExpense(null);
    setShowDatePicker(false);
  };

  const handleUpdateBudget = async () => {
    if (!currentWorkspace) return;
    const val = Number(newBudgetAllocated);
    if (isNaN(val) || val < 0) {
      showToast('Validation Error', 'Budget must be a positive number', 'error');
      return;
    }

    try {
      await updateBudgetMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        allocated: val,
      });
      showToast('Success', 'Budget allocation updated successfully', 'success');
      setIsEditingBudget(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update budget', 'error');
    }
  };

  const handleCreateExpense = async () => {
    if (!currentWorkspace) return;
    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      showToast('Validation Error', 'Please enter a positive amount', 'error');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        amount: val,
        description: description.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
        eventId: selectedEventId || undefined,
        expenseDate: expenseDate || undefined,
      });
      showToast('Success', 'Expense logged successfully', 'success');
      setMode('LIST');
      resetExpenseForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to record expense', 'error');
    }
  };

  const handleEditExpense = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setAmount(expense.amount);
    setDescription(expense.description || '');
    setSelectedCategoryId(
      categories.find((c) => c.name === expense.category_name)?.id || ''
    );
    setSelectedEventId(
      events.find((e) => e.title === expense.event_title)?.id || ''
    );
    setExpenseDate(expense.expense_date.split('T')[0]);
    setMode('EDIT');
  };

  const handleUpdateExpense = async () => {
    if (!currentWorkspace || !selectedExpense) return;
    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      showToast('Validation Error', 'Please enter a positive amount', 'error');
      return;
    }

    try {
      await updateExpenseMutation.mutateAsync({
        id: selectedExpense.id,
        workspaceId: currentWorkspace.id,
        amount: val,
        description: description.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
        eventId: selectedEventId || undefined,
        expenseDate: expenseDate || undefined,
      });
      showToast('Success', 'Expense updated successfully', 'success');
      setMode('LIST');
      resetExpenseForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update expense', 'error');
    }
  };

  const handleDeleteExpense = async (expense: ExpenseItem) => {
    if (!currentWorkspace) return;
    try {
      await deleteExpenseMutation.mutateAsync({
        id: expense.id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Expense deleted successfully', 'success');
      setMode('LIST');
      resetExpenseForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete expense', 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const isOwner = currentWorkspace?.role === 'OWNER';
  const canCreateExpense = hasPermission(currentWorkspace?.role, 'Expenses', 'create');
  const canEditExpense = hasPermission(currentWorkspace?.role, 'Expenses', 'edit');

  // Load calculations
  const budget = budgetData?.budget;
  const allocated = budget ? Number(budget.allocated) : 2500000;
  const spent = budget ? Number(budget.spent) : 1435000;
  const remaining = allocated - spent;

  const rawExpenses = expensesData?.expenses || [];
  const events = eventsData?.events || [];
  const categories = categoriesData?.categories || [];

  // Filter logic
  let filteredExpenses = [...rawExpenses];
  if (selectedFilterTab === 'Unbilled') {
    filteredExpenses = rawExpenses.filter((e) => !e.event_title);
  } else if (selectedFilterTab === 'By Category') {
    filteredExpenses.sort((a, b) => (a.category_name || '').localeCompare(b.category_name || ''));
  } else if (selectedFilterTab === 'By Member') {
    filteredExpenses.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <WorkspaceGuard currentWorkspace={currentWorkspace}>
          {budgetLoading || expensesLoading ? (
            <ThemedView style={styles.center}>
              <ActivityIndicator size="large" color="#5D0921" />
            </ThemedView>
          ) : budgetError || expensesError ? (
            <ThemedView style={styles.center}>
              <ThemedText>Error loading budget data.</ThemedText>
              <TouchableOpacity style={styles.button} onPress={() => refetchExpenses()}>
                <ThemedText style={{ color: theme.background }}>Retry</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : mode === 'DETAIL' && selectedExpense ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <ThemedText type="smallBold" style={styles.formTitle}>Expense Details</ThemedText>
              <ThemedView type="backgroundElement" style={[styles.detailCard, { borderColor: theme.border }]}>
                <ThemedView style={styles.detailRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Amount:</ThemedText>
                  <ThemedText type="smallBold" style={{ fontSize: 24, color: '#E91E63' }}>
                    {formatCurrency(Number(selectedExpense.amount))}
                  </ThemedText>
                </ThemedView>

                {selectedExpense.description && (
                  <ThemedView style={styles.detailCol}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Description:</ThemedText>
                    <ThemedText type="default">{selectedExpense.description}</ThemedText>
                  </ThemedView>
                )}

                <ThemedView style={styles.detailRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Date:</ThemedText>
                  <ThemedText type="default">{safeFormatDate(selectedExpense.expense_date)}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.detailRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Category:</ThemedText>
                  <ThemedText type="default">{selectedExpense.category_name || 'None'}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.detailRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Linked Event:</ThemedText>
                  <ThemedText type="default">{selectedExpense.event_title || 'None'}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.detailRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Logged By:</ThemedText>
                  <ThemedText type="default">{selectedExpense.creator_name || 'System'}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.detailActions}>
                  <PermissionGuard module="Expenses" action="edit">
                    <TouchableOpacity
                      style={[styles.outlineButton, { borderColor: theme.text, flex: 1 }]}
                      onPress={() => handleEditExpense(selectedExpense)}
                    >
                      <ThemedText style={{ color: theme.text, fontWeight: 'bold' }}>
                        Edit
                      </ThemedText>
                    </TouchableOpacity>
                  </PermissionGuard>

                  <PermissionGuard module="Expenses" action="delete">
                    <TouchableOpacity
                      style={[styles.outlineButton, { borderColor: '#ff3b30', flex: 1 }]}
                      onPress={() => handleDeleteExpense(selectedExpense)}
                    >
                      <ThemedText style={{ color: '#ff3b30', fontWeight: 'bold' }}>
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  </PermissionGuard>
                </ThemedView>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setMode('LIST');
                    resetExpenseForm();
                  }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>Back to List</ThemedText>
                </TouchableOpacity>
              </ThemedView>

              <AttachmentSection entityType="EXPENSE" entityId={selectedExpense.id} readOnly={!canEditExpense} />
            </ScrollView>
          ) : mode === 'CREATE' || mode === 'EDIT' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <ThemedText type="smallBold" style={styles.formTitle}>
                {mode === 'EDIT' ? 'Edit Expense' : 'Record Expense'}
              </ThemedText>

              <ThemedView style={styles.form}>
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Amount (₹)</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. 1500.00"
                    placeholderTextColor={theme.textSecondary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </ThemedView>

                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Description</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. Caterer deposit"
                    placeholderTextColor={theme.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </ThemedView>

                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Expense Date</ThemedText>
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
                    onPress={() => setShowDatePicker(true)}
                  >
                    <ThemedText style={{ color: expenseDate ? theme.text : theme.textSecondary }}>
                      {expenseDate || 'Select Expense Date (Default: Today)'}
                    </ThemedText>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={(() => {
                        if (!expenseDate) return new Date();
                        const parsed = Date.parse(expenseDate);
                        return isNaN(parsed) ? new Date() : new Date(parsed);
                      })()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setExpenseDate(selectedDate.toISOString().split('T')[0]);
                        }
                      }}
                      onDismiss={() => setShowDatePicker(false)}
                    />
                  )}
                </ThemedView>

                {/* Category selector */}
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Category</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        { backgroundColor: selectedCategoryId === '' ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      onPress={() => setSelectedCategoryId('')}
                    >
                      <ThemedText style={{ color: selectedCategoryId === '' ? theme.background : theme.text, fontSize: 13 }}>
                        None
                      </ThemedText>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.selectorBtn,
                          { backgroundColor: selectedCategoryId === cat.id ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <ThemedText style={{ color: selectedCategoryId === cat.id ? theme.background : theme.text, fontSize: 13 }}>
                          {cat.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ThemedView>

                {/* Event selector */}
                <ThemedView style={styles.inputWrapper}>
                  <ThemedText type="smallBold">Event Link</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        { backgroundColor: selectedEventId === '' ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                      ]}
                      onPress={() => setSelectedEventId('')}
                    >
                      <ThemedText style={{ color: selectedEventId === '' ? theme.background : theme.text, fontSize: 13 }}>
                        None
                      </ThemedText>
                    </TouchableOpacity>
                    {events.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.selectorBtn,
                          { backgroundColor: selectedEventId === event.id ? theme.text : theme.backgroundSelected, borderColor: theme.border },
                        ]}
                        onPress={() => setSelectedEventId(event.id)}
                      >
                        <ThemedText style={{ color: selectedEventId === event.id ? theme.background : theme.text, fontSize: 13 }}>
                          {event.title}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </ThemedView>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.text, marginTop: Spacing.two }]}
                  onPress={mode === 'EDIT' ? handleUpdateExpense : handleCreateExpense}
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                      {mode === 'EDIT' ? 'Save Changes' : 'Log Expense'}
                    </ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setMode('LIST');
                    resetExpenseForm();
                  }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* HEADER BAR (Hamburger, centered Title, Search/Filter icons) */}
              <View style={styles.appHeaderRow}>
                <TouchableOpacity onPress={() => setCurrentWorkspace(null)} style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <Ionicons name="menu-outline" size={24} color={theme.text} />
                </TouchableOpacity>
                <ThemedText type="title" style={[styles.screenCenterTitle, { color: theme.text }]}>Expenses</ThemedText>
                <View style={styles.headerRightActions}>
                  <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Ionicons name="search-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Ionicons name="funnel-outline" size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* TOTAL SPENT SUMMARY CARD */}
              <ThemedView type="backgroundElement" style={[styles.totalSpentCard, { borderColor: theme.border }]}>
                <View style={styles.spentLabelRow}>
                  <ThemedText type="small" style={[styles.spentSubTitle, { color: theme.textSecondary }]}>Total Spent</ThemedText>
                  <View style={[styles.durationSelector, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={[styles.durationText, { color: theme.text }]}>This Month</ThemedText>
                    <Ionicons name="chevron-down" size={12} color={theme.text} />
                  </View>
                </View>
                <ThemedText style={[styles.totalSpentValue, { color: theme.text }]}>₹{spent.toLocaleString('en-IN')}</ThemedText>

                {/* Sub-cards stats container */}
                <View style={styles.subStatsContainer}>
                  <View style={[styles.subStatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="small" style={[styles.subStatLabel, { color: theme.textSecondary }]}>Allocated</ThemedText>
                    <ThemedText type="smallBold" style={[styles.subStatValue, { color: theme.text }]}>
                      ₹{allocated.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                  <View style={[styles.subStatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="small" style={[styles.subStatLabel, { color: theme.textSecondary }]}>Spent</ThemedText>
                    <ThemedText type="smallBold" style={[styles.subStatValue, { color: '#E91E63' }]}>
                      ₹{spent.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                  <View style={[styles.subStatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="small" style={[styles.subStatLabel, { color: theme.textSecondary }]}>Remaining</ThemedText>
                    <ThemedText type="smallBold" style={[styles.subStatValue, { color: remaining < 0 ? '#ff3b30' : '#4CAF50' }]}>
                      ₹{remaining.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                </View>

                {isOwner && (
                  <TouchableOpacity
                    style={styles.editAllocationLink}
                    onPress={() => {
                      setNewBudgetAllocated(allocated.toString());
                      setIsEditingBudget(!isEditingBudget);
                    }}
                  >
                    <ThemedText style={styles.editAllocationText}>
                      {isEditingBudget ? 'Cancel Edit' : 'Edit Budget Allocation'}
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {isEditingBudget && (
                  <View style={styles.budgetEditorInline}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={newBudgetAllocated}
                      onChangeText={setNewBudgetAllocated}
                      keyboardType="numeric"
                      placeholder="Allocate budget amount"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <TouchableOpacity
                      style={[styles.saveBudgetInlineBtn, { backgroundColor: theme.text }]}
                      onPress={handleUpdateBudget}
                      disabled={updateBudgetMutation.isPending}
                    >
                      {updateBudgetMutation.isPending ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <ThemedText style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                          Save
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ThemedView>

              {/* HORIZONTAL SEGMENT FILTER TABS */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                {(['All', 'Unbilled', 'By Category', 'By Member'] as const).map((tab) => {
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
                         {tab}
                       </ThemedText>
                     </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* LOG EXPENSE BUTTON (MOCK FLOATING BUT ACCESSIBLE ACTION) */}
              {canCreateExpense && (
                <TouchableOpacity
                  style={[styles.logExpenseFullButton, { backgroundColor: theme.text }]}
                  onPress={() => setMode('CREATE')}
                >
                  <ThemedText style={[styles.logExpenseText, { color: theme.background }]}>+ Log New Expense</ThemedText>
                </TouchableOpacity>
              )}

              {/* EXPENSE LOGS LIST */}
              <ThemedText type="smallBold" style={[styles.listHeaderTitle, { color: theme.text }]}>Recent Expenses</ThemedText>
              
              {filteredExpenses.length === 0 ? (
                <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>No Expenses Found</ThemedText>
                  <ThemedText type="default" style={[styles.placeholderText, { color: theme.textSecondary }]}>
                    Add your wedding expense here to keep your budget on track.
                  </ThemedText>
                </ThemedView>
              ) : (
                <View style={styles.list}>
                  {filteredExpenses.map((exp) => (
                    <TouchableOpacity
                      key={exp.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedExpense(exp);
                        setMode('DETAIL');
                      }}
                    >
                      <ThemedView type="backgroundElement" style={[styles.expenseListCard, { borderColor: theme.border }]}>
                        <View style={styles.expenseRowLeft}>
                          {/* Circular Pink Category Icon */}
                          <View style={[styles.categoryIconCircle, { backgroundColor: theme.backgroundSelected }]}>
                            <Ionicons name={getCategoryIcon(exp.category_name) as any} size={20} color="#E91E63" />
                          </View>
                          
                          <View style={styles.expenseTexts}>
                            <ThemedText type="smallBold" style={[styles.expenseTitleName, { color: theme.text }]}>
                              {exp.description || 'Wedding Spends'}
                            </ThemedText>
                            
                            <ThemedText type="small" style={[styles.expenseBreadcrumbs, { color: theme.textSecondary }]}>
                              {exp.category_name || 'Others'} {exp.event_title ? `> ${exp.event_title}` : ''}
                            </ThemedText>
                            
                            <ThemedText type="small" style={styles.expenseAuthor}>
                              By {exp.creator_name || 'System'} • {safeFormatDate(exp.expense_date)}
                            </ThemedText>
                          </View>
                        </View>

                        <View style={styles.expenseRowRight}>
                          <ThemedText type="smallBold" style={styles.expenseCardAmount}>
                            {formatCurrency(Number(exp.amount))}
                          </ThemedText>
                          
                          {/* Paperclip indicator if attachments exist */}
                          {(exp as any).attachments_count && (exp as any).attachments_count > 0 ? (
                            <Ionicons name="attach" size={14} color="#7C5C62" style={{ marginTop: 2 }} />
                          ) : null}
                        </View>
                      </ThemedView>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
          {mode === 'LIST' && canCreateExpense && (
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
  totalSpentCard: {
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  spentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentSubTitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  durationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalSpentValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  subStatCard: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 2,
  },
  subStatLabel: {
    fontSize: 10,
    opacity: 0.5,
  },
  subStatValue: {
    fontSize: 12,
  },
  editAllocationLink: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  editAllocationText: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: 'bold',
  },
  budgetEditorInline: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveBudgetInlineBtn: {
    height: 36,
    paddingHorizontal: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  filterTabButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logExpenseFullButton: {
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
  logExpenseText: {
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
  expenseListCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  expenseRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTexts: {
    flex: 1,
    gap: 2,
  },
  expenseTitleName: {
    fontSize: 14,
  },
  expenseBreadcrumbs: {
    fontSize: 11,
    opacity: 0.6,
  },
  expenseAuthor: {
    fontSize: 11,
    opacity: 0.4,
  },
  expenseRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  expenseCardAmount: {
    fontSize: 14,
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
  selectorBtn: {
    paddingHorizontal: Spacing.three,
    height: 32,
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
  detailCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: Spacing.four,
    marginHorizontal: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCol: {
    gap: Spacing.one,
  },
  detailActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: Spacing.four,
  },
  outlineButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
