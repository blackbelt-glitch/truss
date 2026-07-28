import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme';

// ── Stair calculation logic ────────────────────────────────────────────────────

interface StairResult {
  numberOfSteps: number;
  riserHeight: number;
  treadDepth: number;
  stringerLength: number;
  totalRun: number;
  isCodeCompliant: boolean;
  warnings: string[];
}

function calculateStairs(totalRiseInches: number, desiredSteps: number): StairResult {
  const warnings: string[] = [];
  const riserHeight = totalRiseInches / desiredSteps;

  const isRiserCompliant = riserHeight >= 4 && riserHeight <= 7.75;
  if (riserHeight > 7.75) warnings.push(`Riser ${riserHeight.toFixed(2)}" exceeds 7¾" max — add a step`);
  if (riserHeight < 4) warnings.push(`Riser ${riserHeight.toFixed(2)}" is below 4" min — remove a step`);

  // Blondel's formula: 2R + T = 24.5"
  const treadDepth = Math.max(10, 24.5 - 2 * riserHeight);
  const totalRun = treadDepth * desiredSteps;
  const stringerLength = Math.sqrt(Math.pow(totalRiseInches, 2) + Math.pow(totalRun, 2));

  if (treadDepth < 10) warnings.push(`Tread depth ${treadDepth.toFixed(2)}" is below 10" min`);

  return {
    numberOfSteps: desiredSteps,
    riserHeight,
    treadDepth,
    stringerLength,
    totalRun,
    isCodeCompliant: isRiserCompliant && treadDepth >= 10,
    warnings,
  };
}

function inchesToFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  if (feet === 0) return `${remaining.toFixed(2)}"`;
  return `${feet}' ${remaining.toFixed(2)}"`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StairScreen() {
  const navigation = useNavigation<any>();
  const [totalRise, setTotalRise] = useState('');
  const [desiredSteps, setDesiredSteps] = useState('');
  const [result, setResult] = useState<StairResult | null>(null);
  const [riseUnit, setRiseUnit] = useState<'inches' | 'feet'>('inches');

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const handleCalculate = () => {
    haptic();
    Keyboard.dismiss();

    const riseVal = parseFloat(totalRise);
    if (isNaN(riseVal) || riseVal <= 0) {
      Alert.alert('Missing Info', 'Enter total rise (floor-to-floor height)');
      return;
    }

    const riseInches = riseUnit === 'feet' ? riseVal * 12 : riseVal;
    let steps = parseInt(desiredSteps);
    if (isNaN(steps) || steps <= 0) {
      steps = Math.round(riseInches / 7);
      setDesiredSteps(steps.toString());
    }

    setResult(calculateStairs(riseInches, steps));
  };

  const handleShare = async () => {
    if (!result) return;
    haptic();
    const lines = [
      `STAIR CALCULATOR — Truss`,
      ``,
      `Total Rise: ${totalRise}${riseUnit === 'feet' ? 'ft' : '"'}`,
      `Number of Steps: ${result.numberOfSteps}`,
      ``,
      `RESULTS`,
      `Riser Height: ${result.riserHeight.toFixed(3)}"`,
      `Tread Depth: ${result.treadDepth.toFixed(3)}"`,
      `Total Run: ${inchesToFeetInches(result.totalRun)}`,
      `Stringer Length: ${inchesToFeetInches(result.stringerLength)}`,
      ``,
      result.isCodeCompliant ? '✅ IRC Code Compliant' : '⚠️ Check warnings',
      ...result.warnings.map(w => `⚠️ ${w}`),
    ];
    try {
      await Share.share({ message: lines.join('\n'), title: 'Stair Calculation' });
    } catch {
      Alert.alert('Export', 'Could not share.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { haptic(); navigation.goBack(); }} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stair Calculator</Text>
        {result ? (
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Inputs */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Measurements</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Rise (floor-to-floor)</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={totalRise}
                    onChangeText={setTotalRise}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 108"
                    placeholderTextColor={colors.textDim}
                  />
                  <View style={styles.unitToggle}>
                    {(['inches', 'feet'] as const).map(u => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => { haptic(); setRiseUnit(u); }}
                        style={[styles.unitBtn, riseUnit === u && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, riseUnit === u && styles.unitBtnTextActive]}>
                          {u === 'inches' ? 'in' : 'ft'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Number of Steps{' '}
                  <Text style={styles.optional}>(optional — auto if blank)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={desiredSteps}
                  onChangeText={setDesiredSteps}
                  keyboardType="number-pad"
                  placeholder="e.g. 14"
                  placeholderTextColor={colors.textDim}
                />
              </View>

              <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
                <Text style={styles.calcBtnText}>Calculate</Text>
              </TouchableOpacity>
            </View>

            {/* Results */}
            {result && (
              <>
                <View style={[styles.badge, result.isCodeCompliant ? styles.badgeGreen : styles.badgeAmber]}>
                  <Text style={styles.badgeText}>
                    {result.isCodeCompliant ? '✅ IRC Code Compliant' : '⚠️ Adjust Steps for Compliance'}
                  </Text>
                </View>

                {result.warnings.map((w, i) => (
                  <View key={i} style={styles.warningRow}>
                    <Text style={styles.warningText}>⚠️ {w}</Text>
                  </View>
                ))}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Results</Text>
                  <ResultRow label="Number of Steps" value={result.numberOfSteps.toString()} />
                  <ResultRow
                    label="Riser Height"
                    value={`${result.riserHeight.toFixed(3)}"`}
                    sub={`${inchesToFeetInches(result.riserHeight)} — max 7¾"`}
                    highlight={result.riserHeight > 7.75 || result.riserHeight < 4}
                  />
                  <ResultRow
                    label="Tread Depth"
                    value={`${result.treadDepth.toFixed(3)}"`}
                    sub={`${inchesToFeetInches(result.treadDepth)} — min 10"`}
                    highlight={result.treadDepth < 10}
                  />
                  <ResultRow
                    label="Total Run"
                    value={inchesToFeetInches(result.totalRun)}
                    sub="Horizontal footprint"
                  />
                  <ResultRow
                    label="Stringer Length"
                    value={inchesToFeetInches(result.stringerLength)}
                    sub="Diagonal support board"
                    last
                  />
                </View>

                <View style={styles.tipCard}>
                  <Text style={styles.tipTitle}>💡 IRC Code Reference</Text>
                  <Text style={styles.tipText}>• Riser: 4" min — 7¾" max</Text>
                  <Text style={styles.tipText}>• Tread: 10" min depth</Text>
                  <Text style={styles.tipText}>• Blondel's rule: 2R + T = 24–25"</Text>
                  <Text style={styles.tipText}>• All risers must be within ⅜" of each other</Text>
                </View>
              </>
            )}

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultRow({
  label, value, sub, highlight, last,
}: {
  label: string; value: string; sub?: string; highlight?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.resultRow, last && styles.resultRowLast]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultLabel}>{label}</Text>
        {sub && <Text style={styles.resultSub}>{sub}</Text>}
      </View>
      <Text style={[styles.resultValue, highlight && styles.resultValueWarn]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { color: colors.accent, fontSize: 16 },
  headerTitle: { ...typography.title, color: colors.text },
  shareBtn: { width: 60, alignItems: 'flex-end' },
  shareText: { color: colors.accent, fontSize: 15 },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 12, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase' as const, color: colors.textDim, marginBottom: spacing.md },
  inputGroup: { marginBottom: spacing.md },
  label: { color: colors.textDim, fontSize: 14, marginBottom: 6 },
  optional: { color: colors.textDimmer, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  unitBtnActive: { backgroundColor: colors.accent },
  unitBtnText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  unitBtnTextActive: { color: '#000' },
  calcBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  calcBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  badge: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  badgeGreen: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  badgeAmber: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  badgeText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  warningRow: {
    backgroundColor: colors.accentGlow,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: { color: colors.accent, fontSize: 13 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultRowLast: { borderBottomWidth: 0 },
  resultLabel: { color: colors.text, fontSize: 15, fontWeight: '500' },
  resultSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  resultValue: { color: colors.accent, fontSize: 17, fontWeight: '700', marginLeft: spacing.sm },
  resultValueWarn: { color: colors.red },
  tipCard: {
    backgroundColor: colors.accentGlow,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    marginBottom: spacing.md,
  },
  tipTitle: { color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  tipText: { color: colors.textDim, fontSize: 13, lineHeight: 20 },
});
