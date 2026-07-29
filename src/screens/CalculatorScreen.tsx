import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme';
import {
  materials,
  calculateMaterial,
  formatCurrency,
  effectivePrice,
  MaterialCalculation,
  Material,
} from '../data/materials';
import {
  Project,
  loadProjects,
  saveProject,
  createProject,
  renameProject,
} from '../data/projectStore';
import {
  DefaultPrices,
  loadDefaultPrices,
  setDefaultPrice,
  clearDefaultPrice,
  getDefaultPrice,
  calculateWithDefaultPrice,
} from '../data/priceStore';

type Tab = 'area' | 'materials' | 'cost' | 'convert';

export default function CalculatorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [calculations, setCalculations] = useState<MaterialCalculation[]>([
    calculateMaterial(materials[0], 200),
    calculateMaterial(materials[1], 87),
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeScreen, setActiveScreen] = useState<'calc' | 'projects' | 'export' | 'settings'>('calc');
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultPrices, setDefaultPrices] = useState<DefaultPrices>({});

  // Warm the saved-price cache before any material gets added.
  useEffect(() => {
    loadDefaultPrices().then(setDefaultPrices);
  }, []);

  // Hiding the search bar must always drop the filter with it — otherwise the
  // list stays filtered with no visible control to undo it.
  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);
  const [defaultLaborRate, setDefaultLaborRate] = useState('45');
  const [defaultTax, setDefaultTax] = useState('8');
  // Cost state lifted up so header total reflects it
  const [laborRate, setLaborRate] = useState('45');
  const [hours, setHours] = useState('8');
  const [markup, setMarkup] = useState('20');
  const [tax, setTax] = useState('8');

  // Load project when navigated to with projectId
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any || {};

      // Handle voice calculations coming from VoiceScreen
      if (params.voiceCalculations && params.voiceCalculations.length > 0) {
        setCalculations((prev) => {
          // Merge — keep existing, add new ones
          const merged = [...prev, ...params.voiceCalculations];
          return merged;
        });
        // Clear so it doesn't re-add on next focus
        navigation.setParams({ voiceCalculations: undefined });
        setActiveTab('materials');
      }

      if (params.projectId) {
        loadProjects().then((projects) => {
          const found = projects.find((p: any) => p.id === params.projectId);
          if (found) {
            setProject(found);
            setCalculations(found.calculations);
          } else if (params.isNew) {
            const newProj = createProject(params.projectName || 'New Project');
            setProject(newProj);
            setCalculations([]);
          }
        });
      }
    }, [route.params])
  );

  // Auto-save when calculations change (if we have a project)
  useEffect(() => {
    if (project) {
      const updated = { ...project, calculations };
      saveProject(updated);
    }
  }, [calculations]);

  const totalEstimate = calculations.reduce((sum, c) => sum + c.subtotal, 0);
  const totalSqFt = calculations.reduce((sum, c) => sum + c.quantity, 0);
  const laborCost = parseFloat(laborRate) * parseFloat(hours) || 0;
  const subtotalWithLabor = totalEstimate + laborCost;
  const markupCost = subtotalWithLabor * (parseFloat(markup) / 100 || 0);
  const taxCost = (subtotalWithLabor + markupCost) * (parseFloat(tax) / 100 || 0);
  const grandTotal = subtotalWithLabor + markupCost + taxCost;
  const showingGrandTotal = laborCost > 0 || markupCost > 0 || taxCost > 0;

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style);
  };

  const handleExport = async () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const lines = [
      `ESTIMATE: ${projectName}`,
      `Date: ${new Date().toLocaleDateString()}`,
      ``,
      `MATERIALS`,
      ...calculations.map((c) =>
        `${c.material.icon} ${c.material.name}: ${c.quantity} ${c.material.unit} → ${c.boxesNeeded} units → ${formatCurrency(c.subtotal)}`
      ),
      ``,
      `COST BREAKDOWN`,
      `Materials: ${formatCurrency(totalEstimate)}`,
      ...(parseFloat(laborRate) > 0 ? [`Labor (${laborRate}h × ${hours}h): ${formatCurrency(laborCost)}`] : []),
      ...(parseFloat(markup) > 0 ? [`Markup (${markup}%): ${formatCurrency(markupCost)}`] : []),
      ...(parseFloat(tax) > 0 ? [`Tax (${tax}%): ${formatCurrency(taxCost)}`] : []),
      `────────────────────`,
      `GRAND TOTAL: ${formatCurrency(grandTotal)}`,
    ];
    try {
      await Share.share({ message: lines.join('\n'), title: `${projectName} Estimate` });
    } catch (e) {
      Alert.alert('Export', 'Could not share estimate.');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'area', label: 'Area' },
    { id: 'materials', label: 'Materials' },
    { id: 'cost', label: 'Cost' },
    { id: 'convert', label: 'Convert' },
  ];

  const updateQuantity = (index: number, quantity: number, customName?: string, customPrice?: number) => {
    const calc = calculations[index];
    const newCalc = calculateMaterial(calc.material, quantity, calc.wastePercent, customPrice);
    if (customName && customName.trim() !== calc.material.name) {
      newCalc.customName = customName.trim();
    } else {
      newCalc.customName = undefined;
    }
    const newCalcs = [...calculations];
    newCalcs[index] = newCalc;
    setCalculations(newCalcs);
  };

  const removeMaterial = (index: number) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setCalculations(calculations.filter((_, i) => i !== index));
  };

  const addMaterial = (material: Material, quantity: number) => {
    // Free tier limit: 5 materials
    if (calculations.length >= 5) {
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
      navigation.navigate('Paywall');
      return;
    }
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setCalculations([...calculations, calculateWithDefaultPrice(material, quantity)]);
    setShowAddModal(false);
  };

  const projectName = project?.name || 'Kitchen Remodel';

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => { haptic(); navigation.navigate('Projects'); }}
        >
          <Text style={styles.navBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptic(); setRenameText(projectName); setShowRenameModal(true); }} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.navTitle}>{projectName}</Text>
        </TouchableOpacity>
        <View style={styles.navIcons}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              haptic();
              if (showSearch) {
                closeSearch();
              } else {
                if (activeTab !== 'materials') setActiveTab('materials');
                setShowSearch(true);
              }
            }}
          >
            <Text style={styles.navBtnText}>⌕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, { borderColor: colors.accent, backgroundColor: colors.accentGlow }]} onPress={() => { haptic(); setShowAddModal(true); }}>
            <Text style={[styles.navBtnText, { color: colors.accent, fontWeight: '700', fontSize: 18 }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search materials..."
            placeholderTextColor={colors.textDimmer}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          <TouchableOpacity onPress={closeSearch} style={{ padding: 8 }}>
            <Text style={styles.searchClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Display */}
      <View style={styles.display}>
        <Text style={styles.displayLabel}>{showingGrandTotal ? 'Grand Total' : 'Total Estimate'}</Text>
        <Text style={styles.displayValue}>
          {formatCurrency(showingGrandTotal ? grandTotal : totalEstimate).split('.')[0]}
          <Text style={styles.displayUnit}>.{formatCurrency(showingGrandTotal ? grandTotal : totalEstimate).split('.')[1]}</Text>
        </Text>
        <View style={styles.displaySub}>
          <Text style={styles.displaySubText}>{totalSqFt} sq ft</Text>
          <Text style={styles.displaySubText}>·</Text>
          <Text style={styles.displaySubText}>{calculations.length} materials</Text>
          {showingGrandTotal && <Text style={styles.displaySubText}>· incl. labor & tax</Text>}
        </View>
      </View>

      {/* Mode Tabs */}
      <View style={styles.modeTabs}>
        {tabs.map((tab) => (
          <Pressable
                        key={tab.id}
                        style={[styles.modeTab, activeTab === tab.id && styles.modeTabActive]}
                        onPress={() => { haptic(); setActiveTab(tab.id); closeSearch(); }}
                      >
                        <Text style={[styles.modeTabText, activeTab === tab.id && styles.modeTabTextActive]}>
                          {tab.label}
                        </Text>
                      </Pressable>
        ))}
      </View>

      {/* Content based on tab */}
      {activeTab === 'materials' && (
        <>
        <ScrollView style={styles.inputArea} showsVerticalScrollIndicator={false}>
          {calculations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🪵</Text>
              <Text style={styles.emptyText}>No materials yet</Text>
              <Text style={styles.emptySubtext}>Add your first material to start estimating</Text>
              
              <View style={styles.quickAddRow}>
                <Text style={styles.quickAddLabel}>Quick add:</Text>
                <View style={styles.quickAddChips}>
                  {materials.slice(0, 6).map((m) => (
                    <Pressable
                      key={m.id}
                      style={styles.quickAddChip}
                      onPress={() => {
                        haptic(Haptics.ImpactFeedbackStyle.Medium);
                        setCalculations([...calculations, calculateWithDefaultPrice(m, 100)]);
                      }}
                    >
                      <Text style={styles.quickAddChipIcon}>{m.icon}</Text>
                      <Text style={styles.quickAddChipText}>{m.name.split(' ')[0]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={styles.voiceCTA}
                onPress={() => {
                  haptic(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('Voice');
                }}
              >
                <Text style={styles.voiceCTAIcon}>🎙</Text>
                <View style={styles.voiceCTAText}>
                  <Text style={styles.voiceCTATitle}>Voice Estimate</Text>
                  <Text style={styles.voiceCTASub}>Speak your materials list</Text>
                </View>
                <Text style={styles.voiceCTAArrow}>→</Text>
              </Pressable>

              <Pressable
                style={styles.browseAllBtn}
                onPress={() => { haptic(); setShowAddModal(true); }}
              >
                <Text style={styles.browseAllText}>Browse all materials →</Text>
              </Pressable>
            </View>
          )}
          {calculations
            .filter((calc) => !searchQuery || (calc.customName || calc.material.name).toLowerCase().includes(searchQuery.toLowerCase()))
            .map((calc) => {
              const realIndex = calculations.indexOf(calc);
              return (
            <TouchableOpacity
              key={realIndex}
              style={styles.materialCard}
              onPress={() => { haptic(); setEditingIndex(realIndex); }}
              onLongPress={() => removeMaterial(realIndex)}
            >
              <View style={styles.materialHeader}>
                <Text style={styles.materialIcon}>{calc.material.icon}</Text>
                <Text style={styles.materialName}>{calc.customName || calc.material.name}</Text>
                <View style={styles.materialBadge}>
                  <Text style={styles.materialBadgeText}>{calc.material.category}</Text>
                </View>
              </View>
              <View style={styles.materialRow}>
                <Text style={styles.materialLabel}>Area</Text>
                <Text style={styles.materialValue}>{calc.quantity} {calc.material.unit}</Text>
              </View>
              <View style={styles.materialRow}>
                <Text style={styles.materialLabel}>
                  {calc.material.coveragePerBox ? 'Boxes needed' : 'Pieces needed'}
                </Text>
                <Text style={styles.materialValue}>
                  {calc.boxesNeeded} {calc.material.coveragePerBox ? 'boxes' : 'pcs'}
                </Text>
              </View>
              <View style={styles.materialRow}>
                <Text style={styles.materialLabel}>
                  {calc.material.coveragePerBox ? 'Price / box' : 'Price / unit'}
                  {calc.customPrice != null && <Text style={styles.materialLabelTag}>  · yours</Text>}
                </Text>
                <Text style={[styles.materialValue, calc.customPrice != null && { color: colors.accent }]}>
                  {formatCurrency(effectivePrice(calc))}
                </Text>
              </View>
              <View style={styles.materialTotal}>
                <Text style={styles.materialTotalLabel}>Subtotal</Text>
                <Text style={styles.materialTotalValue}>{formatCurrency(calc.subtotal)}</Text>
              </View>
            </TouchableOpacity>
              );
            })}
        </ScrollView>

        <View style={styles.addRow}>
          <Pressable
            style={styles.addBtn}
            onPress={() => { haptic(); setShowAddModal(true); }}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnText}>Add Material</Text>
          </Pressable>
          <Pressable
            style={styles.micBtn}
            onPress={() => { haptic(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Voice'); }}
            accessibilityLabel="Add material by voice"
          >
            <Text style={styles.micIcon}>🎤</Text>
          </Pressable>
        </View>
        </>
      )}

      {activeTab === 'area' && <AreaView calculations={calculations} onEdit={(i) => { haptic(); setEditingIndex(i); setActiveTab('materials'); }} />}
      {activeTab === 'cost' && <CostView
        calculations={calculations}
        totalEstimate={totalEstimate}
        laborRate={laborRate} setLaborRate={setLaborRate}
        hours={hours} setHours={setHours}
        markup={markup} setMarkup={setMarkup}
        tax={tax} setTax={setTax}
        grandTotal={grandTotal}
        laborCost={laborCost}
        markupCost={markupCost}
        taxCost={taxCost}
        onDone={() => setActiveTab('materials')}
      />}
      {activeTab === 'convert' && <ConvertView />}

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomItem} onPress={() => { haptic(); setActiveScreen('calc'); }}>
          <Text style={[styles.bottomIcon, activeScreen === 'calc' && { color: colors.accent }]}>📐</Text>
          <Text style={[styles.bottomLabel, activeScreen === 'calc' && { color: colors.accent }]}>Calculate</Text>
        </Pressable>
        <Pressable style={styles.bottomItem} onPress={() => { haptic(); setActiveScreen('projects'); navigation.navigate('Projects'); }}>
          <Text style={[styles.bottomIcon, activeScreen === 'projects' && { color: colors.accent }]}>📋</Text>
          <Text style={[styles.bottomLabel, activeScreen === 'projects' && { color: colors.accent }]}>Projects</Text>
        </Pressable>
        <Pressable style={styles.bottomItem} onPress={handleExport}>
          <Text style={styles.bottomIcon}>📤</Text>
          <Text style={styles.bottomLabel}>Export</Text>
        </Pressable>
        <Pressable style={styles.bottomItem} onPress={() => { haptic(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Stair'); }}>
          <Text style={styles.bottomIcon}>🪜</Text>
          <Text style={styles.bottomLabel}>Stairs</Text>
        </Pressable>
        <Pressable style={styles.bottomItem} onPress={() => { haptic(); setActiveScreen('settings'); setShowSettings(true); }}>
          <Text style={[styles.bottomIcon, activeScreen === 'settings' && { color: colors.accent }]}>⚙️</Text>
          <Text style={[styles.bottomLabel, activeScreen === 'settings' && { color: colors.accent }]}>Settings</Text>
        </Pressable>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => { setShowSettings(false); setActiveScreen('calc'); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: spacing.xxl + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️  Settings</Text>
              <TouchableOpacity onPress={() => { setShowSettings(false); setActiveScreen('calc'); }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Default Labor Rate ($/hr)</Text>
            <TextInput style={styles.modalInput} value={defaultLaborRate} onChangeText={setDefaultLaborRate} keyboardType="numeric" selectTextOnFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <Text style={styles.modalLabel}>Default Tax Rate (%)</Text>
            <TextInput style={styles.modalInput} value={defaultTax} onChangeText={setDefaultTax} keyboardType="numeric" selectTextOnFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <Text style={[styles.modalLabel, { marginTop: spacing.lg, color: colors.textDim }]}>Waste Factor</Text>
            <Text style={{ color: colors.textDimmer, fontSize: 13, marginBottom: spacing.md }}>Per-material waste is set automatically. Default: 10%</Text>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => { Keyboard.dismiss(); setShowSettings(false); setActiveScreen('calc'); }}>
              <Text style={styles.modalSaveText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Material Modal */}
      {editingIndex !== null && (
        <EditMaterialModal
          calc={calculations[editingIndex]}
          onClose={() => setEditingIndex(null)}
          onSave={(qty, name, price) => { updateQuantity(editingIndex, qty, name, price); setEditingIndex(null); }}
          onDelete={() => { removeMaterial(editingIndex); setEditingIndex(null); }}
          savedDefault={defaultPrices[calculations[editingIndex].material.id]}
          onSaveDefault={async (price) => {
            const updated = price != null
              ? await setDefaultPrice(calculations[editingIndex!].material.id, price)
              : await clearDefaultPrice(calculations[editingIndex!].material.id);
            setDefaultPrices(updated);
          }}
        />
      )}

      {/* Add Material Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <AddMaterialModal
          onAdd={addMaterial}
          onClose={() => setShowAddModal(false)}
          onVoice={() => navigation.navigate('Voice')}
        />
      </Modal>

      {/* Rename Project Modal */}
      <Modal visible={showRenameModal} animationType="fade" transparent={true} onRequestClose={() => setShowRenameModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setShowRenameModal(false); }}>
          <Pressable style={[styles.modalContent, { paddingBottom: spacing.xxl + insets.bottom }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️  Rename Project</Text>
              <TouchableOpacity onPress={() => setShowRenameModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Project Name</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Project name"
              placeholderTextColor={colors.textDimmer}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={async () => {
                if (!renameText.trim() || !project) return;
                const updated = await renameProject(project.id, renameText.trim());
                const refreshed = updated.find((p) => p.id === project.id);
                if (refreshed) setProject(refreshed);
                setShowRenameModal(false);
              }}
            />
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={async () => {
                if (!renameText.trim() || !project) return;
                const updated = await renameProject(project.id, renameText.trim());
                const refreshed = updated.find((p) => p.id === project.id);
                if (refreshed) setProject(refreshed);
                setShowRenameModal(false);
              }}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Area View — tappable cards to edit each material's quantity
function AreaView({ calculations, onEdit }: { calculations: MaterialCalculation[]; onEdit: (index: number) => void }) {
  const totalArea = calculations.reduce((sum, c) => sum + c.quantity, 0);
  return (
    <ScrollView style={styles.inputArea} contentContainerStyle={{ paddingVertical: 20 }}>
      <View style={styles.bigCard}>
        <Text style={styles.bigCardLabel}>Total Area</Text>
        <Text style={styles.bigCardValue}>{totalArea} sq ft</Text>
        <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4 }}>Tap a material below to change its area</Text>
      </View>
      {calculations.map((calc, i) => (
        <TouchableOpacity key={i} style={[styles.materialCard, { borderWidth: 1, borderColor: colors.border }]} onPress={() => onEdit(i)} activeOpacity={0.7}>
          <View style={styles.materialHeader}>
            <Text style={styles.materialIcon}>{calc.material.icon}</Text>
            <Text style={styles.materialName}>{calc.customName || calc.material.name}</Text>
          </View>
          <View style={styles.materialRow}>
            <Text style={styles.materialLabel}>Area</Text>
            <Text style={[styles.materialValue, { color: colors.accent, fontWeight: '700' }]}>{calc.quantity} {calc.material.unit}</Text>
          </View>
          <View style={styles.materialRow}>
            <Text style={styles.materialLabel}>With waste (+{calc.wastePercent}%)</Text>
            <Text style={styles.materialValue}>{Math.round(calc.totalUnits)} {calc.material.unit}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {calculations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📐</Text>
          <Text style={styles.emptyText}>No materials yet</Text>
          <Text style={styles.emptySubtext}>Add materials on the Materials tab</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Cost View — shows cost breakdown
function CostView({ totalEstimate, laborRate, setLaborRate, hours, setHours, markup, setMarkup, tax, setTax, grandTotal, laborCost, markupCost, taxCost, onDone }: {
  calculations: MaterialCalculation[];
  totalEstimate: number;
  laborRate: string; setLaborRate: (v: string) => void;
  hours: string; setHours: (v: string) => void;
  markup: string; setMarkup: (v: string) => void;
  tax: string; setTax: (v: string) => void;
  grandTotal: number;
  laborCost: number;
  markupCost: number;
  taxCost: number;
  onDone: () => void;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {/* Pinned total — always visible */}
      <View style={styles.costTotalPinned}>
        <Text style={styles.costTotalLabel}>GRAND TOTAL</Text>
        <Text style={styles.costTotalValue}>{formatCurrency(grandTotal)}</Text>
      </View>

      <ScrollView style={styles.inputArea} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Materials</Text>
          <Text style={styles.costValue}>{formatCurrency(totalEstimate)}</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.costLabel}>Labor rate ($/hr)</Text>
          <TextInput style={styles.costInput} value={laborRate} onChangeText={setLaborRate} keyboardType="numeric" selectTextOnFocus returnKeyType="next" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.costLabel}>Hours</Text>
          <TextInput style={styles.costInput} value={hours} onChangeText={setHours} keyboardType="numeric" selectTextOnFocus returnKeyType="next" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Labor cost</Text>
          <Text style={styles.costValue}>{formatCurrency(laborCost)}</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.costLabel}>Markup %</Text>
          <TextInput style={styles.costInput} value={markup} onChangeText={setMarkup} keyboardType="numeric" selectTextOnFocus returnKeyType="next" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Markup</Text>
          <Text style={styles.costValue}>{formatCurrency(markupCost)}</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.costLabel}>Tax %</Text>
          <TextInput style={styles.costInput} value={tax} onChangeText={setTax} keyboardType="numeric" selectTextOnFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Tax</Text>
          <Text style={styles.costValue}>{formatCurrency(taxCost)}</Text>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => { Keyboard.dismiss(); onDone(); }}>
          <Text style={styles.doneBtnText}>✓  Done — View Summary</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Convert View
function ConvertView() {
  const [input, setInput] = useState('1');
  const [unit, setUnit] = useState<'ft' | 'm' | 'in' | 'cm'>('ft');
  const conversions: any = {
    ft: { m: 0.3048, in: 12, cm: 30.48 },
    m: { ft: 3.28084, in: 39.3701, cm: 100 },
    in: { ft: 0.0833333, m: 0.0254, cm: 2.54 },
    cm: { ft: 0.0328084, m: 0.01, in: 0.393701 },
  };
  const value = parseFloat(input) || 0;
  const otherUnits = (['ft', 'm', 'in', 'cm'] as const).filter((u) => u !== unit);
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView style={styles.inputArea} contentContainerStyle={{ paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
        <View style={styles.bigCard}>
          <Text style={styles.bigCardLabel}>Unit Converter</Text>
          <TextInput style={styles.converterInput} value={input} onChangeText={setInput} keyboardType="numeric" selectTextOnFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} placeholder="0" placeholderTextColor={colors.textDimmer} />
        </View>
        <View style={styles.unitTabs}>
          {(['ft', 'm', 'in', 'cm'] as const).map((u) => (
            <Pressable key={u} style={[styles.unitTab, unit === u && styles.unitTabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setUnit(u); }}>
              <Text style={[styles.unitTabText, unit === u && styles.unitTabTextActive]}>{u}</Text>
            </Pressable>
          ))}
        </View>
        {otherUnits.map((targetUnit) => (
          <View key={targetUnit} style={styles.costRow}>
            <Text style={styles.costLabel}>{targetUnit.toUpperCase()}</Text>
            <Text style={styles.costValue}>{(value * conversions[unit][targetUnit]).toFixed(3)} {targetUnit}</Text>
          </View>
        ))}
        <View style={styles.fractionCard}>
          <Text style={styles.fractionLabel}>As Fraction</Text>
          <Text style={styles.fractionValue}>{decimalToFractionSimple(value)} {unit}</Text>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function decimalToFractionSimple(decimal: number): string {
  if (decimal === 0) return '0';
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;
  if (remainder === 0) return whole.toString();
  const common: { [key: string]: string } = {
    '0.0625': '1/16', '0.125': '1/8', '0.1875': '3/16', '0.25': '1/4',
    '0.3125': '5/16', '0.375': '3/8', '0.4375': '7/16', '0.5': '1/2',
    '0.5625': '9/16', '0.625': '5/8', '0.6875': '11/16', '0.75': '3/4',
    '0.8125': '13/16', '0.875': '7/8', '0.9375': '15/16',
  };
  const frac = common[remainder.toFixed(4)];
  if (frac) return whole > 0 ? `${whole} ${frac}` : frac;
  return decimal.toFixed(3);
}

// Edit Material Modal — change quantity and custom name
/**
 * Keep a numeric text field to digits and at most one decimal point.
 * Blocks minus signs, letters, and pasted junk at the source, so a negative
 * or garbage price can never reach the estimate.
 */
function sanitizeNumeric(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

/** Parse a sanitized field into a usable non-negative number, or undefined. */
function parsePositive(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const n = parseFloat(text);
  if (!isFinite(n) || n < 0) return undefined;
  return n;
}

function EditMaterialModal({ calc, onClose, onSave, onDelete, savedDefault, onSaveDefault }: {
  calc: MaterialCalculation;
  onClose: () => void;
  onSave: (qty: number, name?: string, price?: number) => void;
  onDelete: () => void;
  /** The user's saved price for this material, if any. */
  savedDefault?: number;
  /** Save the given price as the default, or clear it when passed undefined. */
  onSaveDefault: (price?: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const perBox = !!calc.material.coveragePerBox;
  const catalogPrice = (perBox ? calc.material.pricePerBox : calc.material.pricePerUnit) || 0;
  const [qty, setQty] = useState(String(calc.quantity));
  const [name, setName] = useState(calc.customName || calc.material.name);
  const [price, setPrice] = useState(calc.customPrice != null ? String(calc.customPrice) : '');

  // Blank price input falls back to the user's saved default, then the catalog
  // price — it never means "free".
  const parsedPrice = parsePositive(price);
  const fallbackPrice = savedDefault ?? catalogPrice;
  const fallbackLabel = savedDefault != null
    ? `your default ${formatCurrency(savedDefault)}`
    : `the catalog price ${formatCurrency(catalogPrice)}`;
  const priceToUse = parsedPrice ?? fallbackPrice;
  const parsedQty = parsePositive(qty) ?? 0;
  const units = parsedQty * (1 + calc.wastePercent / 100);
  const previewCount = perBox
    ? Math.ceil(units / calc.material.coveragePerBox!)
    : Math.ceil(parsedQty);
  const previewSubtotal = previewCount * priceToUse;
  const submit = () => {
    Keyboard.dismiss();
    onSave(parsedQty, name, parsedPrice);
  };
  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { paddingBottom: spacing.xxl + insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{calc.material.icon} Edit Material</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalLabel}>Material Name</Text>
          <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="e.g. Red Oak Hardwood" placeholderTextColor={colors.textDimmer} returnKeyType="next" onSubmitEditing={() => Keyboard.dismiss()} />
          <Text style={styles.modalLabel}>Quantity ({calc.material.unit})</Text>
          <TextInput style={styles.modalInput} value={qty} onChangeText={(t) => setQty(sanitizeNumeric(t))} keyboardType="numeric" selectTextOnFocus returnKeyType="next" onSubmitEditing={() => Keyboard.dismiss()} />
          <Text style={styles.modalLabel}>Your price {perBox ? '/ box' : `/ ${calc.material.unit}`}</Text>
          <TextInput
            style={styles.modalInput}
            value={price}
            onChangeText={(t) => setPrice(sanitizeNumeric(t))}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder={`${formatCurrency(catalogPrice)}  (catalog price)`}
            placeholderTextColor={colors.textDimmer}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Text style={styles.modalHint}>
            {parsedPrice != null
              ? `Using your price. Clear this field to go back to ${fallbackLabel}.`
              : `Leave blank to use ${fallbackLabel}.`}
          </Text>

          {/* Promote this price to the user's default for every future project */}
          {parsedPrice != null && parsedPrice !== savedDefault && (
            <TouchableOpacity style={styles.defaultPriceBtn} onPress={() => onSaveDefault(parsedPrice)}>
              <Text style={styles.defaultPriceBtnText}>
                ☆  Save {formatCurrency(parsedPrice)} as my default for {calc.material.name}
              </Text>
            </TouchableOpacity>
          )}
          {savedDefault != null && (
            <View style={styles.defaultPriceRow}>
              <Text style={styles.defaultPriceNote}>
                ★  Your default: {formatCurrency(savedDefault)}
              </Text>
              <TouchableOpacity onPress={() => onSaveDefault(undefined)}>
                <Text style={styles.defaultPriceClear}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.modalPreview}>
            <Text style={styles.modalPreviewLabel}>{perBox ? 'Boxes' : 'Pieces'} needed: {previewCount}</Text>
            <Text style={styles.modalPreviewLabel}>Subtotal: {formatCurrency(previewSubtotal)}</Text>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={onDelete}><Text style={styles.modalDeleteText}>Delete</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalSaveBtn, { flex: 1 }]} onPress={submit}><Text style={styles.modalSaveText}>Save</Text></TouchableOpacity>
          </View>
        </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Add Material Modal
function AddMaterialModal({ onAdd, onClose, onVoice }: {
  onAdd: (material: Material, quantity: number) => void;
  onClose: () => void;
  onVoice: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Material | null>(null);
  const [qty, setQty] = useState('');
  const [filter, setFilter] = useState('');
  const categories = [...new Set(materials.map((m) => m.category))];
  const filteredMaterials = filter
    ? materials.filter((m) =>
        m.name.toLowerCase().includes(filter.toLowerCase()) ||
        m.category.toLowerCase().includes(filter.toLowerCase())
      )
    : materials;
  const filteredCategories = [...new Set(filteredMaterials.map((m) => m.category))];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={[styles.modalContentLarge, { paddingBottom: spacing.xxl + insets.bottom }]} onPress={(e) => e.stopPropagation()}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Material</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => { onClose(); onVoice(); }} style={[styles.modalCloseBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={[styles.modalCloseText, { color: colors.bg, fontSize: 18 }]}>🎤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!selected && (
          <>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 4, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, color: colors.textDimmer, marginRight: spacing.sm }}>⌕</Text>
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 }}
              value={filter}
              onChangeText={setFilter}
              placeholder="Search 18 materials..."
              placeholderTextColor={colors.textDimmer}
              autoCorrect={false}
              returnKeyType="done"
            />
            {filter.length > 0 && (
              <TouchableOpacity onPress={() => setFilter('')}>
                <Text style={{ color: colors.textDimmer, fontSize: 16, padding: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredCategories.map((cat) => (
              <View key={cat} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>{cat}</Text>
                {filteredMaterials.filter((m) => m.category === cat).map((m) => (
                  <TouchableOpacity key={m.id} style={styles.materialOption} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(m); }}>
                    <Text style={styles.materialOptionIcon}>{m.icon}</Text>
                    <Text style={styles.materialOptionName}>{m.name}</Text>
                    <Text style={[styles.materialOptionPrice, getDefaultPrice(m.id) != null && { color: colors.accent, fontWeight: '600' }]}>
                      {getDefaultPrice(m.id) != null ? '★ ' : ''}
                      ${getDefaultPrice(m.id) ?? (m.coveragePerBox ? m.pricePerBox : m.pricePerUnit)}
                      {m.coveragePerBox ? '/box' : `/${m.unit}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            {filteredCategories.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.textDimmer, fontSize: 15 }}>No materials match "{filter}"</Text>
              </View>
            )}
          </ScrollView>
          </>
        )}
        {selected && (
          <View>
            <View style={styles.selectedMaterial}>
              <Text style={styles.materialIcon}>{selected.icon}</Text>
              <Text style={styles.materialName}>{selected.name}</Text>
            </View>
            <Text style={styles.modalLabel}>Quantity ({selected.unit})</Text>
            <TextInput style={styles.modalInput} value={qty} onChangeText={(t) => setQty(sanitizeNumeric(t))} keyboardType="numeric" selectTextOnFocus autoFocus placeholder="Enter quantity" placeholderTextColor={colors.textDimmer} returnKeyType="done" onSubmitEditing={() => onAdd(selected, parsePositive(qty) ?? 0)} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelected(null)}><Text style={styles.modalCancelText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { flex: 1 }]} onPress={() => onAdd(selected, parsePositive(qty) ?? 0)}><Text style={styles.modalSaveText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </Pressable>
    </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  navTitle: { ...typography.title, color: colors.text },
  navIcons: { flexDirection: 'row', gap: spacing.md },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 18, color: colors.text, fontWeight: '500' },
  display: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl },
  displayLabel: { ...typography.label, color: colors.textDimmer, marginBottom: spacing.sm },
  displayValue: { fontSize: 48, fontWeight: '700', color: colors.text, letterSpacing: -2, lineHeight: 52, fontVariant: ['tabular-nums'] as any },
  displayUnit: { fontSize: 20, fontWeight: '500', color: colors.textDim },
  displaySub: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  displaySubText: { fontSize: 15, color: colors.textDim, fontVariant: ['tabular-nums'] as any },
  modeTabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  modeTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeTabActive: { backgroundColor: colors.text, borderColor: colors.text },
  modeTabText: { fontSize: 13, fontWeight: '500', color: colors.textDim },
  modeTabTextActive: { color: colors.bg },
  inputArea: { flex: 1, paddingHorizontal: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyText: { fontSize: 20, fontWeight: '600', color: colors.textDim, marginBottom: spacing.sm },
  emptySubtext: { fontSize: 14, color: colors.textDimmer, textAlign: 'center', marginBottom: spacing.xxl },
  quickAddRow: { width: '100%', marginBottom: spacing.xl },
  quickAddLabel: { fontSize: 13, fontWeight: '600', color: colors.textDimmer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  quickAddChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickAddChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  quickAddChipIcon: { fontSize: 16 },
  quickAddChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  voiceCTA: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg, width: '100%', marginBottom: spacing.md },
  voiceCTAIcon: { fontSize: 28 },
  voiceCTAText: { flex: 1 },
  voiceCTATitle: { fontSize: 16, fontWeight: '700', color: colors.bg },
  voiceCTASub: { fontSize: 13, color: 'rgba(10,10,10,0.7)', marginTop: 2 },
  voiceCTAArrow: { fontSize: 20, color: colors.bg },
  browseAllBtn: { paddingVertical: spacing.md },
  browseAllText: { fontSize: 15, fontWeight: '600', color: colors.accent },
  materialCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  materialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  materialIcon: { fontSize: 20 },
  materialName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: -0.2, marginLeft: spacing.sm },
  materialBadge: { backgroundColor: colors.accentGlow, paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.pill },
  materialBadgeText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  materialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  materialLabel: { fontSize: 14, color: colors.textDim },
  materialLabelTag: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  materialValue: { fontSize: 14, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] as any },
  materialTotal: { marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  materialTotalLabel: { fontSize: 13, color: colors.textDim },
  materialTotalValue: { fontSize: 20, fontWeight: '700', color: colors.accent, fontVariant: ['tabular-nums'] as any },
  bigCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xxl, marginBottom: spacing.md, alignItems: 'center' },
  bigCardLabel: { ...typography.label, color: colors.textDimmer, marginBottom: spacing.sm },
  bigCardValue: { fontSize: 36, fontWeight: '700', color: colors.accent, letterSpacing: -1.5, fontVariant: ['tabular-nums'] as any },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  costLabel: { fontSize: 15, color: colors.textDim },
  costValue: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] as any },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  costInput: { width: 80, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface2, borderRadius: radius.sm, color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'right', borderWidth: 1, borderColor: colors.border, fontVariant: ['tabular-nums'] as any },
  converterInput: { fontSize: 36, fontWeight: '700', color: colors.text, textAlign: 'center', paddingVertical: 10, fontVariant: ['tabular-nums'] as any },
  unitTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  unitTab: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  unitTabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  unitTabText: { fontSize: 15, fontWeight: '600', color: colors.textDim },
  unitTabTextActive: { color: colors.bg },
  fractionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  fractionLabel: { ...typography.label, color: colors.textDimmer, marginBottom: spacing.sm },
  fractionValue: { fontSize: 24, fontWeight: '600', color: colors.text, letterSpacing: -0.5 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  bottomItem: { alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 4 },
  bottomIcon: { fontSize: 26 },
  bottomLabel: { fontSize: 12, fontWeight: '500', color: colors.textDimmer },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, maxHeight: '90%' },
  modalContentLarge: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, maxHeight: '80%', flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalCloseText: { fontSize: 22, color: colors.text, fontWeight: '600' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  modalLabel: { fontSize: 13, fontWeight: '500', color: colors.textDim, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalHint: { fontSize: 12, color: colors.textDimmer, marginTop: -spacing.sm, marginBottom: spacing.md },
  defaultPriceBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  defaultPriceBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  defaultPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  defaultPriceNote: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  defaultPriceClear: { color: colors.textDim, fontSize: 13, fontWeight: '600', padding: 4 },
  modalInput: { fontSize: 24, fontWeight: '600', color: colors.text, backgroundColor: colors.surface2, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, fontVariant: ['tabular-nums'] as any },
  modalPreview: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  modalPreviewLabel: { fontSize: 14, color: colors.textDim, marginVertical: 4, fontVariant: ['tabular-nums'] as any },
  // Children stretch to share the row evenly. `flex` lives here, not on the
  // buttons — with flex on the button, using one as a direct child of a column
  // sheet collapses its height (flexBasis: 0) and hides its label.
  modalActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  modalSaveBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: colors.bg },
  modalCancelBtn: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.text },
  modalDeleteBtn: { flex: 1, backgroundColor: 'transparent', borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  modalDeleteText: { fontSize: 15, fontWeight: '600', color: colors.red },
  categoryGroup: { marginBottom: spacing.lg },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.textDimmer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  materialOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md, marginBottom: 6, gap: spacing.sm },
  materialOptionIcon: { fontSize: 18 },
  materialOptionName: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  materialOptionPrice: { fontSize: 13, color: colors.textDim, fontVariant: ['tabular-nums'] as any },
  selectedMaterial: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md },
  costTotalPinned: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costTotalLabel: { fontSize: 12, fontWeight: '600', color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' },
  costTotalValue: { fontSize: 28, fontWeight: '800', color: colors.accent, fontVariant: ['tabular-nums'] as any },
  doneBtn: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md },
  doneBtnText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, marginTop: spacing.sm, marginBottom: spacing.md },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 16, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  micBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderHover, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 24, lineHeight: 28, textAlign: 'center', includeFontPadding: false },
  addBtnIcon: { fontSize: 22, fontWeight: '700', color: colors.bg, lineHeight: 24 },
  addBtnText: { fontSize: 17, fontWeight: '700', color: colors.bg, letterSpacing: -0.3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.sm },
  searchClose: { color: colors.text, fontSize: 20, fontWeight: '600' },
});
