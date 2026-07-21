import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '../theme';

type Plan = 'monthly' | 'annual';

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [loading, setLoading] = useState(false);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const hapticMed = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const handleSubscribe = async () => {
    hapticMed();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Start Free Trial',
        'Try Truss Pro free for 3 days, then ' + (selectedPlan === 'annual' ? '$29.99/year' : '$4.99/month') + '. Cancel anytime in Settings.',
        [{ text: 'Start Trial', onPress: () => navigation.navigate('Calculator') }]
      );
    }, 600);
  };

  const handleRestore = () => {
    haptic();
    Alert.alert('Restore Purchases', 'No previous purchases found.');
  };

  const handleNotNow = () => {
    haptic();
    // Free tier — navigate to calculator with limits
    navigation.navigate('Calculator', { freeTier: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🔧</Text>
          <Text style={styles.title}>Truss Pro</Text>
          <Text style={styles.subtitle}>
            The construction estimator that works where you work
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {[
            { icon: '🎙', title: 'Voice estimates', sub: 'Speak your materials list, Truss does the math' },
            { icon: '📋', title: 'Unlimited projects', sub: 'Save every job, switch between them instantly' },
            { icon: '💰', title: 'Full cost breakdown', sub: 'Labor, markup, and tax in one grand total' },
            { icon: '📤', title: 'Share estimates', sub: 'Send quotes to clients via text or email' },
            { icon: '📶', title: '100% offline', sub: 'Works on any job site — no signal needed' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>

          {/* Annual — featured */}
          <Pressable
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => { haptic(); setSelectedPlan('annual'); }}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>BEST VALUE · SAVE 50%</Text>
            </View>
            <View style={styles.planRow}>
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameSelected]}>Annual</Text>
                  <Text style={styles.planPer}>$2.50 / month</Text>
                </View>
              </View>
              <View style={styles.planPriceBlock}>
                <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceSelected]}>$29.99</Text>
                <Text style={styles.planCycle}>/ year</Text>
              </View>
            </View>
          </Pressable>

          {/* Monthly */}
          <Pressable
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => { haptic(); setSelectedPlan('monthly'); }}
          >
            <View style={styles.planRow}>
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameSelected]}>Monthly</Text>
                  <Text style={styles.planPer}>Flexible, cancel anytime</Text>
                </View>
              </View>
              <View style={styles.planPriceBlock}>
                <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>$4.99</Text>
                <Text style={styles.planCycle}>/ month</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Trial CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.trialBadge}>🎁  3-DAY FREE TRIAL</Text>

          <Pressable
            style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            <Text style={styles.ctaBtnText}>
              {loading ? 'Starting...' : 'Start Free Trial'}
            </Text>
          </Pressable>

          <Text style={styles.trialNote}>
            Free for 3 days. Then {selectedPlan === 'annual' ? '$29.99/year' : '$4.99/month'}.{'\n'}
            Cancel anytime in iPhone Settings → Subscriptions.
          </Text>
        </View>

        {/* Social proof */}
        <View style={styles.proof}>
          <Text style={styles.proofText}>
            "Finally an estimator that tells me what it costs, not just what it measures."
          </Text>
          <Text style={styles.proofAuthor}>— Contractor, verified review</Text>
        </View>

        {/* Compare to competition */}
        <View style={styles.compare}>
          <Text style={styles.compareTitle}>Compare</Text>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Construction Master Pro</Text>
            <Text style={styles.comparePrice}>$40/yr · no cost calc</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>magicplan</Text>
            <Text style={styles.comparePrice}>$90/mo · complex setup</Text>
          </View>
          <View style={[styles.compareRow, styles.compareRowUs]}>
            <Text style={[styles.compareLabel, { color: colors.accent, fontWeight: '700' }]}>Truss Pro</Text>
            <Text style={[styles.comparePrice, { color: colors.accent, fontWeight: '700' }]}>$29.99/yr · offline · voice</Text>
          </View>
        </View>

        {/* Footer links */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleNotNow}>
            <Text style={styles.footerLink}>Continue with free version</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          Payment charged to your Apple Account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage subscriptions in Account Settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  logo: { fontSize: 52, marginBottom: spacing.md },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -1, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.textDim, textAlign: 'center', maxWidth: 280, lineHeight: 22 },

  // Features
  features: { marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  featureIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  featureIconText: { fontSize: 18 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  featureSub: { fontSize: 12, color: colors.textDim },
  featureCheck: { fontSize: 16, color: colors.accent, fontWeight: '700' },

  // Plans
  plans: { gap: spacing.sm, marginBottom: spacing.xl },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.border, position: 'relative', overflow: 'hidden' },
  planCardSelected: { borderColor: colors.accent, backgroundColor: '#1A1000' },
  planBadge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: spacing.sm },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: colors.bg, letterSpacing: 0.5 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 17, fontWeight: '600', color: colors.textDim, marginBottom: 2 },
  planNameSelected: { color: colors.text },
  planPer: { fontSize: 12, color: colors.textDimmer },
  planPriceBlock: { alignItems: 'flex-end' },
  planPrice: { fontSize: 24, fontWeight: '800', color: colors.textDim, fontVariant: ['tabular-nums'] as any },
  planPriceSelected: { color: colors.accent },
  planCycle: { fontSize: 12, color: colors.textDimmer },
  planSelectedDot: { display: 'none' }, // removed — replaced by radio
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },

  // CTA
  ctaSection: { alignItems: 'center', marginBottom: spacing.xl },
  trialBadge: { fontSize: 13, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, marginBottom: spacing.md },
  ctaBtn: { width: '100%', backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.md, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  ctaBtnLoading: { opacity: 0.7 },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: colors.bg, letterSpacing: -0.3 },
  trialNote: { fontSize: 12, color: colors.textDimmer, textAlign: 'center', lineHeight: 18 },

  // Proof
  proof: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, borderLeftWidth: 3, borderLeftColor: colors.accent },
  proofText: { fontSize: 14, color: colors.text, fontStyle: 'italic', lineHeight: 22, marginBottom: spacing.sm },
  proofAuthor: { fontSize: 12, color: colors.textDim },

  // Compare
  compare: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl },
  compareTitle: { fontSize: 13, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surface2 },
  compareRowUs: { borderBottomWidth: 0, marginTop: 2 },
  compareLabel: { fontSize: 14, color: colors.textDim },
  comparePrice: { fontSize: 13, color: colors.textDimmer },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.lg },
  footerLink: { fontSize: 13, color: colors.textDim, textDecorationLine: 'underline' },

  // Legal
  legal: { fontSize: 10, color: colors.textDimmer, textAlign: 'center', lineHeight: 15 },
});
