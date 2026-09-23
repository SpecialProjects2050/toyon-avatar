/**
 * The O in context: the three Rincon screens at 1:1, scaled to fit. Side by side when the
 * window is wide enough (a desktop browser), else one at a time with paging (a phone).
 */
import { useState } from 'react'
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { OnboardingScreen, ProfileScreen, SearchScreen, type ScreenProps } from './Screens'
import { SCREEN_H, SCREEN_W } from './tokens'

const GAP = 32

/** A 430 × 932 screen drawn at `scale`, in a box of the scaled size. */
function Shot({ scale, children }: { scale: number; children: React.ReactNode }) {
  return (
    <View style={{ width: SCREEN_W * scale, height: SCREEN_H * scale, overflow: 'visible' }}>
      <View
        style={{
          position: 'absolute',
          left: (SCREEN_W * scale - SCREEN_W) / 2,
          top: (SCREEN_H * scale - SCREEN_H) / 2,
          width: SCREEN_W,
          height: SCREEN_H,
          transform: [{ scale }],
        }}
      >
        {children}
      </View>
    </View>
  )
}

export function ContextStage(props: ScreenProps) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })

  const screens = [
    <OnboardingScreen key="onboarding" state={props.state} voice={props.voice} />,
    <SearchScreen key="search" state={props.state} voice={props.voice} />,
    <ProfileScreen key="profile" state={props.state} voice={props.voice} avatar={props.avatar} />,
  ]

  const fitThree = Math.min(1, (box.h - 16) / SCREEN_H, (box.w - GAP) / (3 * SCREEN_W + 2 * GAP))
  const fitOne = Math.min(1, (box.h - 16) / SCREEN_H, (box.w - 32) / SCREEN_W)
  const row = fitThree >= 0.4

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {box.w > 0 && (row ? (
        <View style={[styles.row, { gap: GAP * fitThree }]}>
          {screens.map((s, i) => <Shot key={i} scale={fitThree}>{s}</Shot>)}
        </View>
      ) : (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: box.w }} contentContainerStyle={{ alignItems: 'center' }}>
          {screens.map((s, i) => (
            <View key={i} style={{ width: box.w, alignItems: 'center', justifyContent: 'center' }}>
              <Shot scale={fitOne}>{s}</Shot>
            </View>
          ))}
        </ScrollView>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
})
