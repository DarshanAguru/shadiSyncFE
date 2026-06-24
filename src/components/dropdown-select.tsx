import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DropdownSelect({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
}: DropdownSelectProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
      )}

      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <ThemedText
          style={{
            fontSize: 14,
            color: selectedOption ? theme.text : theme.textSecondary,
          }}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <ThemedView
            type="backgroundElement"
            style={[
              styles.modalContent,
              {
                borderColor: theme.border,
                shadowColor: '#000',
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                {label || 'Select Option'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={true}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      isSelected && { backgroundColor: 'rgba(233, 30, 99, 0.08)' },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <ThemedText
                      style={{
                        fontSize: 14,
                        color: isSelected ? '#E91E63' : theme.text,
                        fontWeight: isSelected ? 'bold' : 'normal',
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#E91E63" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: 2,
  },
  selector: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxHeight: screenHeight * 0.5,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
