import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme';
import { formatCurrency } from '../data/materials';
import {
  Project,
  loadProjects,
  deleteProject,
  createProject,
} from '../data/projectStore';

export default function ProjectsScreen() {
  const navigation = useNavigation<any>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = async () => {
    const loaded = await loadProjects();
    setProjects(loaded);
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style);
  };

  const openProject = (project: Project) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Calculator', { projectId: project.id });
  };

  const createNew = async () => {
    if (!newName.trim()) return;
    // Free tier limit: 1 project
    if (projects.length >= 1) {
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
      setShowNewModal(false);
      navigation.navigate('Paywall');
      return;
    }
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const project = createProject(newName.trim());
    setNewName('');
    setShowNewModal(false);
    navigation.navigate('Calculator', { projectId: project.id, isNew: true });
  };

  const confirmDelete = (project: Project) => {
    haptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Project',
      `Delete "${project.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteProject(project.id);
            setProjects(updated);
          },
        },
      ]
    );
  };

  const renderProject = ({ item }: { item: Project }) => {
    const total = item.calculations.reduce((sum, c) => sum + c.subtotal, 0);
    const sqft = item.calculations.reduce((sum, c) => sum + c.quantity, 0);

    return (
      <Pressable
        style={styles.projectCard}
        onPress={() => openProject(item)}
        onLongPress={() => confirmDelete(item)}
      >
        <View style={styles.projectHeader}>
          <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.projectHeaderRight}>
            <Text style={styles.projectDate}>{formatDate(item.updatedAt)}</Text>
            {/* Long-press deletes too, but that's invisible — give it a control. */}
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Text style={styles.projectDeleteBtn}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.projectStats}>
          <Text style={styles.projectStat}>{item.calculations.length} materials</Text>
          <Text style={styles.projectStat}>·</Text>
          <Text style={styles.projectStat}>{sqft} sq ft</Text>
        </View>
        <Text style={styles.projectTotal}>{formatCurrency(total)}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => { haptic(); navigation.goBack(); }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Projects</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { haptic(); setShowNewModal(true); }}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "+ New" to create your first estimate
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={{ padding: spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Project Modal */}
      <Modal visible={showNewModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Project</Text>
                <TouchableOpacity onPress={() => { setShowNewModal(false); setNewName(''); }}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>Project Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholder="e.g. Johnson Kitchen Remodel"
                placeholderTextColor={colors.textDimmer}
                returnKeyType="done"
                onSubmitEditing={createNew}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowNewModal(false); setNewName(''); }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={createNew}>
                  <Text style={styles.modalSaveText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  navTitle: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.8, flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: colors.text },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.pill },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.bg },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.textDim, marginBottom: spacing.sm },
  emptySubtext: { fontSize: 14, color: colors.textDimmer, textAlign: 'center' },
  projectCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  projectHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  projectName: { fontSize: 17, fontWeight: '600', color: colors.text, letterSpacing: -0.3, flex: 1, marginRight: spacing.sm },
  projectDeleteBtn: { fontSize: 16, opacity: 0.65 },
  projectDate: { fontSize: 13, color: colors.textDimmer },
  projectStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  projectStat: { fontSize: 13, color: colors.textDim },
  projectTotal: { fontSize: 24, fontWeight: '700', color: colors.accent, fontVariant: ['tabular-nums'] as any },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalCloseText: { fontSize: 20, color: colors.textDim },
  modalLabel: { fontSize: 13, fontWeight: '500', color: colors.textDim, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { fontSize: 18, fontWeight: '500', color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalSaveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: colors.bg },
  modalCancelBtn: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
