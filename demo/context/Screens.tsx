/**
 * The three Rincon Explore screens (onboarding, search, profile), built from the Figma file
 * V8mdvZt3EuYkdBKuKvzffX (nodes 1568:3778, 1553:14053, 1575:3965) at 1:1, 430 × 932, each
 * hosting a live <ToyonOrb /> on the design's exact node bounds. Demo only: the app has its own
 * screens; this shows where the O sits and how big it is.
 */
import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { ToyonOrb } from '../../src'
import type { AgentState } from '../../src/core/machine'
import type { VoiceSource } from '../../src/core/source'
import { A } from './assets'
import { INK, INK_05, INK_10, INK_30, INK_50, PAPER, SANS, SCREEN_H, SCREEN_W, SERIF } from './tokens'

export type ScreenProps = {
  state: AgentState
  voice?: VoiceSource
  /** The chef on the O in `chef` (profile screen only). */
  avatar?: ImageSourcePropType
}

/** The O on a node's bounds: the component is 2× the O on each side, so it is centred on the slot. */
function Slot({ x, y, size, state, voice, avatar }: ScreenProps & { x: number; y: number; size: number }) {
  return (
    <ToyonOrb
      state={state}
      size={size}
      voice={voice}
      avatar={avatar}
      style={[styles.slot, { left: x + size / 2 - size, top: y + size / 2 - size }]}
    />
  )
}

/** 1568:3778 — onboarding: the O sits centre-bottom, 101 px, centred on the frame. */
export function OnboardingScreen({ state, voice }: ScreenProps) {
  return (
    <View style={[styles.screen, { borderRadius: 64 }]}>
      <Image source={A.wordmark} style={{ position: 'absolute', left: 163, top: 96, width: 104.707, height: 24 }} />

      <View style={styles.prompts}>
        <Text style={styles.promptText}>{'Which voice do you like?\n​\nHow often do you cook?\n​\nLet’s improve'}</Text>
      </View>
      <LinearGradient
        colors={['rgba(254, 249, 245, 0.8)', PAPER]}
        locations={[0, 0.56251]}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={{ position: 'absolute', left: 69, top: 338, width: 285, height: 63 }}
      />
      <LinearGradient
        colors={['rgba(254, 249, 245, 0.8)', PAPER]}
        locations={[0, 0.56251]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 96, top: 475, width: 242, height: 63 }}
      />

      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotOn]} />
      </View>

      {/* bottom row: the O on the frame's centre line, speaker and Skip mirrored at the same inset */}
      <View style={styles.onbBottom}>
        <Image source={A.speaker} style={{ position: 'absolute', left: 63, top: 50.5 - 12, width: 24, height: 24 }} />
        <Text style={styles.skip}>Skip</Text>
      </View>
      <Slot x={SCREEN_W / 2 - 50.5} y={768} size={101} state={state} voice={voice} />
    </View>
  )
}

const RECENT = [
  { img: A.wagyu, title: 'Wagyu Burger with Bacon and Blue Cheese', sub: '20 mins · easy' },
  { img: A.cake, title: 'Evelyn Sharpe’s French Chocolate Cake', sub: '1 hour 15 mins · difficult' },
  { img: A.grapefruit, title: 'Grapefruit Fluff', sub: '1 hour 15 mins · medium' },
]

const COLLAGE = [
  { img: A.collage2, style: { left: 7, top: 7 } },
  { img: A.collage1, style: { right: 17.61, bottom: 17.61 } },
  { img: A.collage3, style: { left: 17.61, top: 17.61 } },
  { img: A.collage4, style: { right: 7, bottom: 7 } },
]

const FAVORITES = [
  { img: A.salad, title: 'Mediterranean-Style Chopped Salad with Oregano Vinaigrette', by: 'Amanda Hesser', from: 'From Jackie' },
  { img: A.wagyu, title: 'Spicy Chicken Wings', by: 'Amanda Hesser', from: 'From Mary' },
  { img: A.cake, title: 'Black and cold noodles', by: 'Amanda Hesser', from: 'From Diana' },
]

function Row({ img, title, sub }: { img: ImageSourcePropType; title: string; sub: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.thumb}><Image source={img} style={styles.fill} contentFit="cover" /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
    </View>
  )
}

function H2({ children, caret, caretSize = 16 }: { children: string; caret?: ImageSourcePropType; caretSize?: number }) {
  return (
    <View style={styles.h2Row}>
      <Text style={styles.h2}>{children}</Text>
      {caret && <Image source={caret} style={{ width: caretSize, height: caretSize, transform: [{ rotate: '180deg' }, { scaleY: -1 }] }} />}
    </View>
  )
}

/** 1553:14053 — search over the blurred home; the O sits bottom-right, 72 px at (342, 820). */
export function SearchScreen({ state, voice }: ScreenProps) {
  return (
    <View style={[styles.screen, styles.search]}>
      {/* the home screen beneath, at 30% through a 60px blur */}
      <View style={styles.home} pointerEvents="none">
        <View style={styles.homeHead}>
          <View style={styles.avatar40}><Image source={A.avatar} style={styles.fill} contentFit="cover" /></View>
          <Image source={A.wordmark} style={{ width: 104.707, height: 24 }} />
          <View style={styles.iconBtn}><Image source={A.magnifier} style={styles.icon24} /></View>
        </View>
        <View style={styles.homeCards}>
          <View style={styles.hero}>
            <Image source={A.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['rgba(48, 24, 8, 0)', '#301808']}
              style={{ position: 'absolute', left: -20, right: -20, bottom: -66, height: 350 }}
            />
            <Text style={styles.heroTitle}>Marry Me Chicken</Text>
            <Text style={styles.heroSub}>Amanda Hesser</Text>
            <View style={styles.heroActions}>
              <View style={[styles.pill, styles.pillGlass]}><Text style={styles.pillGlassText}>Preview</Text></View>
              <View style={[styles.pill, styles.pillCream]}>
                <Image source={A.play} style={{ width: 12, height: 12 }} />
                <Text style={styles.pillCreamText}>Cook</Text>
              </View>
            </View>
          </View>
          <View style={styles.hero}><Image source={A.hero2} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
        </View>
        <View style={styles.homeList}>
          <Text style={styles.h2}>Bookmark</Text>
          {RECENT.map((r) => <Row key={r.title} {...r} />)}
        </View>
      </View>
      <BlurView intensity={100} tint="light" experimentalBlurMethod="dimezisBlurView" style={[StyleSheet.absoluteFill, { borderRadius: 64 }]} pointerEvents="none" />

      {/* the search overlay */}
      <View style={styles.searchBar}>
        <View style={styles.searchLeft}>
          <View style={styles.iconBtn}><Image source={A.magnifier} style={styles.icon24} /></View>
          <Text style={styles.searchText}><Text style={{ color: INK }}>|</Text>Search</Text>
        </View>
        <Image source={A.x} style={styles.icon24} />
      </View>

      <View style={styles.chips}>
        {['Time', 'Cuisine', 'Difficulty'].map((c) => (
          <View style={styles.chip} key={c}>
            <Text style={styles.chipText}>{c}</Text>
            <Image source={A.caret} style={{ width: 8, height: 8, transform: [{ rotate: '-90deg' }, { scaleY: -1 }] }} />
          </View>
        ))}
      </View>

      <View style={styles.recent}>
        <Text style={styles.label}>Recent</Text>
        {RECENT.map((r, i) => (
          <View key={r.title}>
            {i > 0 && <View style={styles.divider} />}
            <Row {...r} />
          </View>
        ))}
      </View>

      <Slot x={342} y={820} size={72} state={state} voice={voice} />
    </View>
  )
}

/** 1575:3965 — profile: the O sits bottom-right, 72 px at (335, 833), with the chef's avatar
 * overlapping its lower-right (the component places and reveals it). */
export function ProfileScreen({ state, voice, avatar }: ScreenProps) {
  return (
    <View style={[styles.screen, styles.profile]}>
      <View style={styles.profileHead}>
        <View style={styles.profileBar}>
          <View style={styles.backBtn}><Image source={A.caretLeft} style={styles.icon24} /></View>
          <View style={styles.profileId}>
            <View style={styles.avatar80}>
              {/* the file's crop of image 1544: 186.59% × 278.88%, offset −19.03% / −56.69% */}
              <Image source={A.jacob} style={{ position: 'absolute', width: '186.59%', height: '278.88%', left: '-19.03%', top: '-56.69%' }} contentFit="fill" />
            </View>
            <Text style={styles.profileName}>Jacob Smith</Text>
            <Text style={styles.profileStats}>20 recipes · 10 hrs cooking</Text>
          </View>
          <View style={[styles.backBtn, { opacity: 0 }]}><Image source={A.caretLeft} style={styles.icon24} /></View>
        </View>
        <View style={styles.seg}>
          <View style={[styles.segItem, styles.segOn]}><Text style={[styles.segText, { color: INK }]}>Activity</Text></View>
          <View style={styles.segItem}><Text style={styles.segText}>Settings</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <H2 caret={A.caret16}>Meal Plan</H2>
        <View style={styles.mealPlans}>
          {['4 recipes · 3h 15m', '4 recipes · 3h 15m total'].map((sub) => (
            <View style={styles.mealCard} key={sub}>
              <View style={styles.collage}>
                {COLLAGE.map((t, i) => (
                  <View style={[styles.collageTile, t.style]} key={i}><Image source={t.img} style={styles.fill} contentFit="cover" /></View>
                ))}
              </View>
              <View>
                <Text style={styles.mealTitle} numberOfLines={1}>Thanksgiving Dinner</Text>
                <Text style={styles.mealSub} numberOfLines={1}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sections}>
        <View style={styles.section}>
          <H2 caret={A.caret16}>Favorites</H2>
          <View style={styles.cards}>
            {FAVORITES.map((c) => (
              <View style={styles.card} key={c.title}>
                <View style={styles.cardImg}><Image source={c.img} style={styles.fill} contentFit="cover" /></View>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardBy} numberOfLines={1}>{c.by}</Text>
                <Text style={styles.cardFrom} numberOfLines={1}>{c.from}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <H2 caret={A.caret18} caretSize={18}>Bookmark</H2>
          <Row img={A.wagyu} title="Wagyu Burger with Bacon and Blue Cheese" sub="20 mins · easy" />
        </View>
      </View>

      <Slot x={335} y={833} size={72} state={state} voice={voice} avatar={avatar} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    position: 'relative',
    width: SCREEN_W,
    height: SCREEN_H,
    overflow: 'hidden',
    backgroundColor: PAPER,
  },
  slot: { position: 'absolute', zIndex: 2, backgroundColor: 'transparent' },
  fill: { width: '100%', height: '100%' },
  icon24: { width: 24, height: 24 },

  // onboarding
  prompts: { position: 'absolute', left: SCREEN_W / 2 - 0.5 - 297 / 2, top: 0, bottom: 54, width: 297, justifyContent: 'center' },
  promptText: { fontFamily: SERIF, fontSize: 24, lineHeight: 33.6, color: INK, textAlign: 'center' },
  dots: { position: 'absolute', left: 406, top: SCREEN_H / 2 - 34, alignItems: 'center', gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 16, backgroundColor: INK, opacity: 0.3 },
  dotOn: { height: 12, opacity: 1 },
  onbBottom: { position: 'absolute', left: 0, right: 0, top: 768, height: 101 },
  skip: { position: 'absolute', right: 63, top: 50.5 - 9.6, fontFamily: SANS, fontSize: 16, lineHeight: 19.2, letterSpacing: 0.2, fontWeight: '500', color: INK_50 },

  // search
  search: { borderRadius: 72, alignItems: 'center', gap: 24, paddingTop: 88, paddingBottom: 56 },
  home: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 224, gap: 32, opacity: 0.3, borderRadius: 64 },
  homeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar40: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' },
  iconBtn: { width: 40, height: 40, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  homeCards: { flexDirection: 'row', gap: 8 },
  hero: {
    width: 366, height: 458, flexShrink: 0, borderRadius: 16, overflow: 'hidden', backgroundColor: '#efefef',
    alignItems: 'center', justifyContent: 'flex-end', gap: 16, paddingVertical: 32, paddingHorizontal: 24,
  },
  heroTitle: { fontFamily: SANS, fontWeight: '700', fontSize: 24, lineHeight: 28.8, letterSpacing: 0.2, color: '#fff' },
  heroSub: { fontFamily: SERIF, fontWeight: '700', fontSize: 16, lineHeight: 24, color: 'rgba(255, 255, 255, 0.8)' },
  heroActions: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 20, borderRadius: 40 },
  pillGlass: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 250, 241, 0.1)' },
  pillGlassText: { fontFamily: SANS, fontSize: 16, fontWeight: '500', letterSpacing: 0.2, color: '#fff' },
  pillCream: { backgroundColor: '#fffaf1' },
  pillCreamText: { fontFamily: SANS, fontSize: 16, fontWeight: '500', letterSpacing: 0.2, color: '#000' },
  homeList: { width: 382, gap: 16 },
  h2Row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  h2: { fontFamily: SANS, fontWeight: '700', fontSize: 18, lineHeight: 21.6, color: INK },
  searchBar: { width: 382, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchText: { fontFamily: SANS, fontSize: 16, lineHeight: 19.2, letterSpacing: 0.2, color: INK_30 },
  chips: { width: 382, flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: INK_10, borderRadius: 80 },
  chipText: { fontFamily: SANS, fontSize: 14, lineHeight: 14, color: INK },
  recent: { width: 382, gap: 16 },
  label: { fontFamily: SANS, fontSize: 16, lineHeight: 20.8, color: INK_50 },
  divider: { height: 1, backgroundColor: INK_10, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  thumb: { width: 80, height: 80, borderRadius: 16, overflow: 'hidden', backgroundColor: INK_10, flexShrink: 0 },
  rowText: { justifyContent: 'center', flexShrink: 1 },
  rowTitle: { fontFamily: SANS, fontSize: 16, lineHeight: 20.8, fontWeight: '500', color: INK, maxWidth: 172 },
  rowSub: { fontFamily: SANS, fontSize: 14, lineHeight: 18.2, color: INK_50 },

  // profile
  profile: { borderRadius: 64, alignItems: 'center', gap: 40, paddingTop: 88, paddingBottom: 56 },
  profileHead: { alignItems: 'center', gap: 16 },
  profileBar: { width: 398, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  backBtn: { padding: 8, borderRadius: 40, backgroundColor: PAPER },
  profileId: { alignItems: 'center', gap: 12 },
  avatar80: { width: 80, height: 80, borderRadius: 71.111, overflow: 'hidden' },
  profileName: { fontFamily: SERIF, fontSize: 24, lineHeight: 33.6, color: INK, textAlign: 'center' },
  profileStats: { fontFamily: SERIF, fontSize: 16, lineHeight: 24, color: INK_50, marginTop: -12, textAlign: 'center' },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 200, backgroundColor: INK_05, borderWidth: 1, borderColor: INK_05 },
  segItem: { width: 90, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 88, alignItems: 'center' },
  segOn: { backgroundColor: PAPER },
  segText: { fontFamily: SANS, fontSize: 16, lineHeight: 19.2, letterSpacing: 0.2, fontWeight: '500', color: INK_30 },
  section: { width: 382, gap: 16 },
  sections: { width: 382, gap: 41 },
  mealPlans: { flexDirection: 'row', gap: 8, width: 382 },
  mealCard: {
    flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 16, height: 90,
    paddingTop: 8, paddingRight: 32, paddingBottom: 8, paddingLeft: 8, borderWidth: 1, borderColor: INK_10, borderRadius: 16,
  },
  collage: { width: 68, height: 68, overflow: 'hidden', flexShrink: 0 },
  collageTile: { position: 'absolute', width: 38.571, height: 38.571, borderRadius: 3.857, overflow: 'hidden', backgroundColor: PAPER },
  mealTitle: { fontFamily: SANS, fontWeight: '700', fontSize: 18, lineHeight: 21.6, color: INK },
  mealSub: { fontFamily: SANS, fontSize: 16, lineHeight: 19.2, letterSpacing: 0.2, color: 'rgba(0, 0, 0, 0.6)' },
  cards: { flexDirection: 'row', gap: 8, width: 382 },
  card: { width: 179, flexShrink: 0, gap: 2 },
  cardImg: { width: 179, height: 179, borderRadius: 16, overflow: 'hidden', marginBottom: 6 },
  cardTitle: { fontFamily: SANS, fontSize: 16, lineHeight: 20.8, fontWeight: '500', color: INK, maxWidth: 173 },
  cardBy: { fontFamily: SANS, fontSize: 14, lineHeight: 18.2, color: INK_50 },
  cardFrom: { fontFamily: SANS, fontSize: 12, lineHeight: 15.6, color: '#ff4d24' },
})
