import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme';
import { materials, calculateMaterial, formatCurrency, MaterialCalculation } from '../data/materials';

interface ParsedItem {
  icon: string;
  qty: string;
  name: string;
  meta: string;
  price: number;
  calculation: MaterialCalculation | null;
}

export default function VoiceScreen() {
  const navigation = useNavigation<any>();
  const [transcript, setTranscript] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const haptic = (style = Haptics.ImpactFeedbackStyle.Light) => Haptics.impactAsync(style);

  const parseManual = () => {
    if (!manualInput.trim()) return;
    Keyboard.dismiss();
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setTranscript(manualInput);
    parseTranscript(manualInput);
    setManualInput('');
  };

  const loadDemo = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const demo = 'I need 200 square feet of hardwood, 150 square feet of tile, and 30 linear feet of baseboard';
    setTranscript(demo);
    parseTranscript(demo);
  };

  const reset = () => {
    haptic();
    setParsedItems([]);
    setTranscript('');
    setError(null);
    setManualInput('');
  };

  const parseTranscript = (text: string) => {
    setIsProcessing(true);
    setError(null);
    const lower = text.toLowerCase();
    const items: ParsedItem[] = [];

    const patterns = [
      /([\d]+(?:\.[\d]+)?)\s*(?:square\s*feet|sq\s*ft|sqft|sq\.?\s*ft)\s*(?:of\s+)?([a-z\s]+?)(?:,|$|\sand\s)/gi,
      /([\d]+(?:\.[\d]+)?)\s*(?:linear\s*feet|lin\s*ft|lineal\s*feet)\s*(?:of\s+)?([a-z\s]+?)(?:,|$|\sand\s)/gi,
      /([\d]+(?:\.[\d]+)?)\s*(?:ft|feet)\s*(?:of\s+)?([a-z\s]+?)(?:,|$|\sand\s)/gi,
    ];

    const matches: { qty: number; unit: string; materialText: string }[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(lower)) !== null) {
        const qty = parseFloat(match[1]);
        const isLinear = pattern.source.includes('linear') || pattern.source.includes('lin');
        matches.push({ qty, unit: isLinear ? 'linear ft' : 'sq ft', materialText: match[2].trim() });
      }
    }

    if (matches.length === 0) {
      // simple fallback: "10 tile" "200 hardwood"
      const simple = /([\d]+(?:\.[\d]+)?)\s*(?:of\s+)?([a-z]+)/gi;
      let m;
      while ((m = simple.exec(lower)) !== null) {
        matches.push({ qty: parseFloat(m[1]), unit: 'sq ft', materialText: m[2].trim() });
      }
    }

    for (const m of matches) {
      const mat = findMaterial(m.materialText);
      if (mat) {
        const calc = calculateMaterial(mat, m.qty);
        items.push({
          icon: mat.icon,
          qty: `${calc.boxesNeeded} ${mat.coveragePerBox ? 'boxes' : 'pcs'}`,
          name: mat.name,
          meta: `${m.qty} ${m.unit} · +${calc.wastePercent}% waste`,
          price: calc.subtotal,
          calculation: calc,
        });
      } else {
        items.push({
          icon: '❓',
          qty: `${m.qty}`,
          name: m.materialText.charAt(0).toUpperCase() + m.materialText.slice(1),
          meta: `${m.unit} · not recognized`,
          price: 0,
          calculation: null,
        });
      }
    }

    setParsedItems(items);
    setIsProcessing(false);
    if (items.length === 0) {
      setError("Couldn't parse materials. Try: '200 sq ft of hardwood, 150 of tile'");
    }
  };

  const findMaterial = (text: string) => {
    const lower = text.toLowerCase().trim();
    const map: { [k: string]: string } = {
      hardwood: 'hardwood-oak', oak: 'hardwood-oak', 'wood floor': 'hardwood-oak',
      tile: 'tile-porcelain-12x24', porcelain: 'tile-porcelain-12x24', ceramic: 'tile-ceramic-12x12',
      laminate: 'laminate-flooring', vinyl: 'vinyl-plank', carpet: 'carpet',
      paint: 'paint-interior', primer: 'paint-primer', concrete: 'concrete-bag',
      drywall: 'drywall-4x8', sheetrock: 'drywall-4x8',
      roofing: 'roofing-bundle', shingles: 'roofing-bundle',
      baseboard: 'baseboard-mdf', trim: 'baseboard-mdf',
      '2x4': 'lumber-2x4', lumber: 'lumber-2x4', plywood: 'plywood-4x8',
      insulation: 'insulation-r13', grout: 'grout-sanded', thinset: 'thinset-modified',
    };
    for (const [kw, id] of Object.entries(map)) {
      if (lower.includes(kw)) return materials.find((m) => m.id === id);
    }
    return null;
  };

  const saveToProject = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const calcs = parsedItems
      .map((p) => p.calculation)
      .filter((c): c is MaterialCalculation => c !== null);
    navigation.navigate('Calculator', { voiceCalculations: calcs });
  };

  const hasResults = parsedItems.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => { haptic(); navigation.goBack(); }}>
          <Text style={styles.navBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Voice Estimate</Text>
        <Pressable style={styles.navBtn} onPress={reset}>
          <Text style={styles.navBtnText}>↺</Text>
        </Pressable>
      </View>

      {/* Orb — shrinks when results are showing */}
      <View style={[styles.orbSection, hasResults && styles.orbSectionCompact]}>
        <Pressable style={[styles.voiceOrb, hasResults && styles.voiceOrbSmall]} onPress={loadDemo}>
          {isProcessing
            ? <ActivityIndicator size="large" color="white" />
            : <Text style={[styles.voiceIcon, hasResults && styles.voiceIconSmall]}>🎙</Text>
          }
        </Pressable>
        <Text style={styles.voiceStatus}>
          {isProcessing ? 'Parsing...' : hasResults ? 'Tap ↺ to reset' : 'TAP MIC TO START'}
        </Text>
      </View>

      {/* Input — only show when no results yet */}
      {!hasResults && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inputSection}>
            <TextInput
              style={styles.manualInput}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Type: '200 sq ft of hardwood, 150 of tile'"
              placeholderTextColor={colors.textDimmer}
              multiline
              blurOnSubmit
              returnKeyType="done"
              onSubmitEditing={parseManual}
            />
            <View style={styles.inputActions}>
              <Pressable style={styles.demoBtn} onPress={loadDemo}>
                <Text style={styles.demoBtnText}>Try demo</Text>
              </Pressable>
              <Pressable
                style={[styles.parseBtn, !manualInput.trim() && styles.parseBtnDisabled]}
                onPress={parseManual}
                disabled={!manualInput.trim()}
              >
                <Text style={styles.parseBtnText}>Parse →</Text>
              </Pressable>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Results */}
      {hasResults && (
        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultsLabel}>PARSED MATERIALS</Text>
          {parsedItems.map((item, i) => (
            <View key={i} style={styles.resultCard}>
              <View style={styles.resultIconWrap}>
                <Text style={styles.resultIcon}>{item.icon}</Text>
              </View>
              <View style={styles.resultText}>
                <Text style={styles.resultName}>
                  <Text style={styles.resultQty}>{item.qty} </Text>
                  {item.name}
                </Text>
                <Text style={styles.resultMeta}>{item.meta}</Text>
              </View>
              <Text style={styles.resultPrice}>
                {item.price > 0 ? formatCurrency(item.price) : '—'}
              </Text>
            </View>
          ))}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>
      )}

      {/* Actions */}
      {hasResults && (
        <View style={styles.actions}>
          <Pressable style={styles.btnSecondary} onPress={reset}>
            <Text style={styles.btnSecondaryText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={saveToProject}>
            <Text style={styles.btnPrimaryText}>Save to Project</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  navTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  navBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { fontSize: 16, color: colors.textDim },

  orbSection: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  orbSectionCompact: { paddingTop: spacing.md, paddingBottom: spacing.md },

  voiceOrb: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 30, elevation: 10,
  },
  voiceOrbSmall: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm },
  voiceIcon: { fontSize: 56 },
  voiceIconSmall: { fontSize: 28 },
  voiceStatus: {
    fontSize: 12, fontWeight: '600', color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },

  inputSection: { flex: 1, paddingHorizontal: spacing.xl },
  manualInput: {
    fontSize: 16, color: colors.text, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, minHeight: 90, marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  inputActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  demoBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  demoBtnText: { fontSize: 15, fontWeight: '600', color: colors.textDim },
  parseBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  parseBtnDisabled: { opacity: 0.4 },
  parseBtnText: { fontSize: 15, fontWeight: '600', color: colors.bg },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginTop: spacing.md },

  results: { flex: 1 },
  resultsContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  resultsLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textDimmer,
    letterSpacing: 1, marginBottom: spacing.md, textAlign: 'center',
  },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  resultIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  resultIcon: { fontSize: 20 },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 2 },
  resultQty: { color: colors.accent, fontWeight: '700' },
  resultMeta: { fontSize: 12, color: colors.textDim },
  resultPrice: { fontSize: 16, fontWeight: '700', color: colors.text },

  actions: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.sm,
  },
  btnPrimary: {
    flex: 2, paddingVertical: 16, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: colors.bg },
  btnSecondary: {
    flex: 1, paddingVertical: 16, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
