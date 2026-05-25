import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const BASE_URL = "https://nonprotectively-privies-seamus.ngrok-free.dev";

const CAMPUS_BOUNDS = {
  minLat: 6.6895, maxLat: 6.6925,
  minLon: -1.6120, maxLon: -1.6080,
};

const isOnCampus = (lat: number, lon: number) =>
  lat >= CAMPUS_BOUNDS.minLat && lat <= CAMPUS_BOUNDS.maxLat &&
  lon >= CAMPUS_BOUNDS.minLon && lon <= CAMPUS_BOUNDS.maxLon;

const STEP_PROXIMITY_METERS = 15;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const p = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * p) / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) *
    Math.sin(((lon2 - lon1) * p) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface CampusLocation {
  id: number; name: string;
  latitude: number; longitude: number; type: string;
  isGpsLocation?: boolean;
}
interface Coordinate { latitude: number; longitude: number; }
interface RouteResult {
  start: string; end: string;
  coordinates: Coordinate[];
  steps: { from: string; to: string; instruction: string }[];
  distance_m: number; distance_km: number; estimated_walk_minutes: number;
}
interface GateResult {
  id: number; name: string; latitude: number; longitude: number;
  distance_to_gate_m: number; estimated_walk_to_gate_minutes: number;
}
interface Washroom {
  id: number; name: string;
  gender: 'male' | 'female' | 'unisex'; gender_display: string;
  latitude: number; longitude: number;
  description: string; distance_m: number; walk_minutes: number;
}
interface SuggestedLocation {
  id: string; name: string; type: string;
  latitude: number; longitude: number; description: string;
}

// ─── Dark Map Style ────────────────────────────────────────────────────────
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c54' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

// ─── Search Bar ────────────────────────────────────────────────────────────
function SearchBar({ placeholder, value, onSelect, onClear, dotColor }: {
  placeholder: string; value: CampusLocation | null;
  onSelect: (l: CampusLocation) => void; onClear: () => void; dotColor: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CampusLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = async (t: string) => {
    setQuery(t);
    if (!t) { setResults([]); return; }
    setBusy(true);
    try {
      const r = await fetch(`${BASE_URL}/api/navigation/search/?q=${encodeURIComponent(t)}`);
      setResults((await r.json()).results || []);
    } catch { setResults([]); } finally { setBusy(false); }
  };

  const pick = (l: CampusLocation) => { setQuery(''); setResults([]); setOpen(false); onSelect(l); };
  const clear = () => { setQuery(''); setResults([]); setOpen(false); onClear(); };

  const icon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('building')) return '🏛️';
    if (t.includes('gate')) return '🚪';
    if (t.includes('atm')) return '🏧';
    if (t.includes('sport')) return '⚽';
    if (t.includes('hall') || t.includes('hostel')) return '🏠';
    if (t.includes('park')) return '🅿️';
    return '📍';
  };

  return (
    <View style={{ zIndex: 100, marginBottom: 2 }}>
      <View style={[sb.bar, open && sb.barOn]}>
        <View style={[sb.dot, { backgroundColor: dotColor }]} />
        <TextInput
          style={sb.inp}
          placeholder={value ? value.name : placeholder}
          placeholderTextColor={value ? '#e2e8f0' : '#64748b'}
          value={query}
          onChangeText={search}
          onFocus={() => { setOpen(true); if (value) setQuery(''); }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {busy && <ActivityIndicator size="small" color="#3b82f6" />}
        {(value || query) && (
          <TouchableOpacity onPress={clear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={sb.x}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {open && results.length > 0 && (
        <View style={sb.drop}>
          <FlatList
            data={results.slice(0, 7)} keyExtractor={i => i.id.toString()}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity style={sb.item} onPress={() => pick(item)}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>{icon(item.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sb.iName}>{item.name}</Text>
                  <Text style={sb.iType}>{item.type}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#334155', gap: 10 },
  barOn: { borderColor: '#3b82f6' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  inp: { flex: 1, color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  x: { color: '#64748b', fontSize: 14, padding: 2 },
  drop: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155', zIndex: 999, elevation: 25, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  iName: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  iType: { color: '#64748b', fontSize: 11, marginTop: 1 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const locSub = useRef<Location.LocationSubscription | null>(null);

  const navigatingRef = useRef(false);
  const stepIdxRef = useRef(0);
  const routeRef = useRef<RouteResult | null>(null);

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [from, setFrom] = useState<CampusLocation | null>(null);
  const [to, setTo] = useState<CampusLocation | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [userCoord, setUserCoord] = useState<Coordinate | null>(null);
  const [onCampus, setOnCampus] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [arrived, setArrived] = useState(false);

  const [offCampusGate, setOffCampusGate] = useState<GateResult | null>(null);
  const [gmapsUrl, setGmapsUrl] = useState<string | null>(null);
  const [showOffCampusBanner, setShowOffCampusBanner] = useState(false);

  const [washrooms, setWashrooms] = useState<Washroom[]>([]);
  const [showWashrooms, setShowWashrooms] = useState(false);
  const [washroomLoading, setWashroomLoading] = useState(false);

  // ── Item 13: Guest mode ──
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();

  // ── Item 4: Suggest location state ──
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestType, setSuggestType] = useState('other');
  const [suggestDesc, setSuggestDesc] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [approvedSuggestions, setApprovedSuggestions] = useState<SuggestedLocation[]>([]);

  const CAMPUS = { latitude: 6.69120, longitude: -1.61000 };

  useEffect(() => { navigatingRef.current = navigating; }, [navigating]);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);
  useEffect(() => { routeRef.current = route; }, [route]);

  useEffect(() => {
    // Check if guest mode
    AsyncStorage.getItem('guestMode').then(val => { if (val === 'true') setIsGuest(true); });
    loadLocations();
    startTracking(true);
    loadApprovedSuggestions(); // Item 4
    return () => { locSub.current?.remove(); };
  }, []);

  useEffect(() => {
    if (locations.length > 0 && userCoord && onCampus && !from) {
      snapToNearest(userCoord);
    }
  }, [locations, userCoord]);

  useEffect(() => {
    if (from && to) handleFindRoute();
  }, [from, to]);

  const snapToNearest = (coord: Coordinate) => {
    let closest: CampusLocation | null = null, minD = Infinity;
    for (const loc of locations) {
      const d = Math.hypot(loc.latitude - coord.latitude, loc.longitude - coord.longitude);
      if (d < minD) { minD = d; closest = loc; }
    }
    if (closest) setFrom(closest);
  };

  // ── Item 4: Load approved student-suggested locations ──
  const loadApprovedSuggestions = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/navigation/suggest-location/approved/`);
      const data = await res.json();
      setApprovedSuggestions(data.locations || []);
    } catch {}
  };

  // ── Item 4: Submit a new location suggestion ──
  const submitLocationSuggestion = async () => {
    if (!suggestName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this location.');
      return;
    }
    if (!userCoord) {
      Alert.alert('Location needed', 'Enable location first.');
      return;
    }
    setSuggestLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${BASE_URL}/api/navigation/suggest-location/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: suggestName.trim(),
          location_type: suggestType,
          latitude: userCoord.latitude,
          longitude: userCoord.longitude,
          description: suggestDesc.trim(),
        }),
      });
      const data = await res.json();
      Alert.alert('Submitted! 📍', data.message || 'Location sent for admin review.');
      setShowSuggestModal(false);
      setSuggestName('');
      setSuggestDesc('');
      setSuggestType('other');
    } catch {
      Alert.alert('Error', 'Could not submit location.');
    } finally {
      setSuggestLoading(false);
    }
  };

  // ── Location tracking ──────────────────────────────────────────────────
  const startTracking = async (autoSetFrom = false) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required for navigation.');
      return;
    }

    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coord = { latitude: initial.coords.latitude, longitude: initial.coords.longitude };
    const campus = isOnCampus(coord.latitude, coord.longitude);
    setUserCoord(coord);
    setOnCampus(campus);
    mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 800);

    if (autoSetFrom && !campus) {
      setFrom({
        id: -1, name: '📍 My Current Location',
        latitude: coord.latitude, longitude: coord.longitude,
        type: 'gps', isGpsLocation: true,
      });
    }

    locSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1000 },
      loc => {
        const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoord(c);
        setOnCampus(isOnCampus(c.latitude, c.longitude));

        if (navigatingRef.current) {
          mapRef.current?.animateToRegion({
            latitude: c.latitude, longitude: c.longitude,
            latitudeDelta: 0.0008, longitudeDelta: 0.0008,
          }, 600);

          const r = routeRef.current;
          const idx = stepIdxRef.current;
          if (!r) return;

          for (let i = idx + 1; i < r.coordinates.length; i++) {
            const wp = r.coordinates[i];
            const dist = haversineMeters(c.latitude, c.longitude, wp.latitude, wp.longitude);
            if (dist <= STEP_PROXIMITY_METERS) {
              const newStep = Math.min(i, r.steps.length - 1);
              if (newStep > idx) {
                stepIdxRef.current = newStep;
                setStepIdx(newStep);
                const instruction = r.steps[newStep]?.instruction;
                if (instruction) {
                  Speech.stop();
                  Speech.speak(instruction, { language: 'en-US', pitch: 1.0, rate: 0.9 });
                }
                if (i >= r.coordinates.length - 1) {
                  setArrived(true);
                  navigatingRef.current = false;
                  Speech.stop();
                  Speech.speak(`You have arrived at ${r.end}. Navigation complete.`, { language: 'en-US', pitch: 1.0, rate: 0.9 });
                }
              }
              break;
            }
          }
        }
      }
    );
  };

  const loadLocations = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/navigation/locations/`);
      setLocations((await r.json()).locations || []);
    } catch { Alert.alert('Error', 'Cannot reach server. Check BASE_URL.'); }
  };

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', pitch: 1.0, rate: 0.9 });
  };

  const handleFindRoute = async () => {
    if (!from || !to) return;
    if (from.isGpsLocation || (!onCampus && userCoord)) {
      await findOffCampusRoute(); return;
    }
    await findOnCampusRoute(from.id, to.id);
  };

  const findOnCampusRoute = async (fromId: number, toId: number) => {
    setLoading(true); setRoute(null); setShowOffCampusBanner(false); setArrived(false);
    try {
      const r = await fetch(`${BASE_URL}/api/navigation/route/?start_id=${fromId}&end_id=${toId}`);
      const data = await r.json();
      if (data.error) { Alert.alert('Route Error', data.error); return; }
      setRoute(data); setStepIdx(0); fitMap(data.coordinates);
      speak(`Route found. ${data.estimated_walk_minutes} minute walk. ${data.steps[0]?.instruction}`);
    } catch { Alert.alert('Error', 'Could not fetch route.'); }
    finally { setLoading(false); }
  };

  const findOffCampusRoute = async () => {
    if (!to) return;
    const originLat = (from?.isGpsLocation ? from.latitude : null) ?? userCoord?.latitude;
    const originLon = (from?.isGpsLocation ? from.longitude : null) ?? userCoord?.longitude;
    if (!originLat || !originLon) return;
    setLoading(true); setRoute(null); setArrived(false);
    try {
      const url = `${BASE_URL}/api/navigation/nearest-gate/?lat=${originLat}&lon=${originLon}&destination_id=${to.id}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setOffCampusGate(data.nearest_gate); setGmapsUrl(data.google_maps_url); setShowOffCampusBanner(true);
      if (data.on_campus_route && !data.on_campus_route.error) {
        setRoute(data.on_campus_route); fitMap(data.on_campus_route.coordinates);
      }
      const gate = data.nearest_gate;
      speak(`You are outside campus. Nearest gate is ${gate.name}, ${Math.round(gate.distance_to_gate_m)} meters away.`);
    } catch { Alert.alert('Error', 'Could not fetch off-campus route.'); }
    finally { setLoading(false); }
  };

  const fitMap = (coords: Coordinate[]) => {
    if (coords.length > 0) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 200, right: 40, bottom: 340, left: 40 }, animated: true,
      });
    }
  };

  const useMyLocation = async () => {
    if (!userCoord) { await startTracking(false); return; }
    if (!onCampus) {
      setFrom({ id: -1, name: '📍 My Current Location', latitude: userCoord.latitude, longitude: userCoord.longitude, type: 'gps', isGpsLocation: true });
    } else { snapToNearest(userCoord); }
  };

  const openGoogleMaps = () => { if (gmapsUrl) Linking.openURL(gmapsUrl); };

  const startNav = () => {
    setNavigating(true); setArrived(false); setStepIdx(0); stepIdxRef.current = 0;
    if (route?.steps[0]) {
      speak(`Starting navigation to ${route.end}. ${route.steps[0].instruction}`);
      if (userCoord) mapRef.current?.animateToRegion({ latitude: userCoord.latitude, longitude: userCoord.longitude, latitudeDelta: 0.0008, longitudeDelta: 0.0008 }, 800);
    }
  };

  const stopNav = () => {
    setNavigating(false); setArrived(false); Speech.stop();
    if (route) setTimeout(() => fitMap(route.coordinates), 600);
  };

  const nextStep = () => {
    if (!route) return;
    const n = Math.min(stepIdx + 1, route.steps.length - 1);
    setStepIdx(n);
    speak(route.steps[n]?.instruction ?? 'You have arrived!');
    if (route.coordinates[n + 1])
      mapRef.current?.animateToRegion({ ...route.coordinates[n + 1], latitudeDelta: 0.0008, longitudeDelta: 0.0008 }, 500);
  };

  const prevStep = () => {
    if (!route) return;
    const p = Math.max(stepIdx - 1, 0);
    setStepIdx(p);
    speak(route.steps[p]?.instruction ?? '');
  };

  const clearAll = () => {
    setFrom(null); setTo(null); setRoute(null);
    setNavigating(false); setArrived(false); setStepIdx(0);
    setOffCampusGate(null); setGmapsUrl(null); setShowOffCampusBanner(false);
    setWashrooms([]); setShowWashrooms(false);
    Speech.stop();
  };

  const centerUser = () => {
    if (!userCoord) { startTracking(false); return; }
    mapRef.current?.animateToRegion({
      latitude: userCoord.latitude, longitude: userCoord.longitude,
      latitudeDelta: navigating ? 0.0008 : 0.002,
      longitudeDelta: navigating ? 0.0008 : 0.002,
    }, 500);
  };

  // ── Washrooms ──────────────────────────────────────────────────────────
  const washroomEmoji = (gender: string) => gender === 'male' ? '🚹' : gender === 'female' ? '🚺' : '🚻';

  const fetchNearbyWashrooms = async (lat: number, lon: number) => {
    setWashroomLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/navigation/washrooms/nearby/?lat=${lat}&lon=${lon}&radius=400`);
      const data = await res.json();
      const list: Washroom[] = data.washrooms || [];
      setWashrooms(list); setShowWashrooms(true);
      if (list.length === 0) Alert.alert('No washrooms found', 'No washrooms within 400m.');
      else speak(`${list.length} washroom${list.length > 1 ? 's' : ''} nearby. Nearest is ${list[0].name}, ${list[0].distance_m} meters away.`);
    } catch { Alert.alert('Error', 'Could not fetch nearby washrooms.'); }
    finally { setWashroomLoading(false); }
  };

  const toggleWashrooms = () => {
    if (showWashrooms) { setShowWashrooms(false); setWashrooms([]); return; }
    if (!userCoord) { Alert.alert('Location needed', 'Enable location first.'); return; }
    fetchNearbyWashrooms(userCoord.latitude, userCoord.longitude);
  };

  const buildings = locations.filter(l => !l.name.toLowerCase().startsWith('walk') && l.type !== 'path');
  const remainingCoords = route ? route.coordinates.slice(stepIdx) : [];
  const travelledCoords = route ? route.coordinates.slice(0, stepIdx + 1) : [];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* MAP */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        initialRegion={{ ...CAMPUS, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        showsUserLocation showsMyLocationButton={false} showsCompass rotateEnabled pitchEnabled
      >
        {!navigating && buildings.map(loc => (
          <Marker key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.name} description={loc.type}
            pinColor={from?.id === loc.id ? 'green' : to?.id === loc.id ? 'red' : '#3b82f6'}
          />
        ))}

        {/* ── Item 4: Approved student-suggested locations — purple pins ── */}
        {approvedSuggestions.map(loc => (
          <Marker
            key={`sugg-${loc.id}`}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.name}
            description={`${loc.type} • Student suggested`}
            pinColor="#a855f7"
          />
        ))}

        {showOffCampusBanner && offCampusGate && (
          <Marker
            coordinate={{ latitude: offCampusGate.latitude, longitude: offCampusGate.longitude }}
            title={`🚪 ${offCampusGate.name}`} description="Your nearest campus gate" pinColor="orange"
          />
        )}

        {route && travelledCoords.length > 1 && (
          <Polyline coordinates={travelledCoords} strokeColor="rgba(100,116,139,0.5)" strokeWidth={6} lineCap="round" />
        )}
        {route && remainingCoords.length > 1 && (
          <>
            <Polyline coordinates={remainingCoords} strokeColor="rgba(37,99,235,0.3)" strokeWidth={14} lineCap="round" />
            <Polyline coordinates={remainingCoords} strokeColor="#2563eb" strokeWidth={7} lineCap="round" lineJoin="round" />
          </>
        )}
        {route && !navigating && <Marker coordinate={route.coordinates[0]} anchor={{ x: 0.5, y: 0.5 }}><View style={s.startDot} /></Marker>}
        {navigating && route && route.coordinates[stepIdx + 1] && (
          <Marker coordinate={route.coordinates[stepIdx + 1]} anchor={{ x: 0.5, y: 0.5 }}><View style={s.nextWaypointDot} /></Marker>
        )}
        {route && <Marker coordinate={route.coordinates[route.coordinates.length - 1]} pinColor="#ef4444" />}

        {showWashrooms && washrooms.map(w => (
          <Marker key={`w-${w.id}`} coordinate={{ latitude: w.latitude, longitude: w.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.washroomPin}><Text style={s.washroomPinEmoji}>{washroomEmoji(w.gender)}</Text></View>
            <Callout tooltip>
              <View style={s.washroomCallout}>
                <Text style={s.washroomCalloutTitle}>{w.name}</Text>
                <Text style={s.washroomCalloutGender}>{w.gender_display}</Text>
                {!!w.description && <Text style={s.washroomCalloutDesc}>{w.description}</Text>}
                <Text style={s.washroomCalloutDist}>📍 {w.distance_m}m · ~{w.walk_minutes} min</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* ── SEARCH PANEL ── */}
      {!navigating && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.topOverlay} pointerEvents="box-none">
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.title}>🗺️ KsTU Navigator</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {userCoord && (
                  <View style={[s.campusPill, onCampus ? s.onCampus : s.offCampus]}>
                    <Text style={s.campusPillTxt}>{onCampus ? '✓ On Campus' : '⚠ Off Campus'}</Text>
                  </View>
                )}
                {(from || to || route) && (
                  <TouchableOpacity style={s.clearPill} onPress={clearAll}>
                    <Text style={s.clearPillTxt}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={s.searchRow}>
              <View style={s.dotLine}>
                <View style={[s.ld, { backgroundColor: '#22c55e' }]} />
                <View style={s.ls} />
                <View style={[s.ld, { backgroundColor: '#ef4444' }]} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <SearchBar placeholder="Starting point" value={from} onSelect={setFrom} onClear={() => setFrom(null)} dotColor="#22c55e" />
                <SearchBar placeholder="Where to?" value={to} onSelect={setTo} onClear={() => setTo(null)} dotColor="#ef4444" />
              </View>
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity style={s.myLocBtn} onPress={useMyLocation}>
                <Text style={s.myLocTxt}>📍 My Loc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.washroomBtn, showWashrooms && s.washroomBtnActive]} onPress={toggleWashrooms} disabled={washroomLoading}>
                {washroomLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.washroomBtnTxt}>{showWashrooms ? '🚻 Hide' : '🚻 Near'}</Text>}
              </TouchableOpacity>
              {/* ── Item 4: Suggest location button ── */}
              <TouchableOpacity
                style={s.suggestBtn}
                onPress={() => {
                  if (!userCoord) { Alert.alert('Location needed', 'Enable location first.'); return; }
                  setShowSuggestModal(true);
                }}
              >
                <Text style={s.suggestBtnTxt}>📍 Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.findBtn, (!from || !to || loading) && s.findBtnOff]}
                onPress={handleFindRoute} disabled={!from || !to || loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.findBtnTxt}>Route</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── WASHROOM LIST ── */}
      {showWashrooms && washrooms.length > 0 && !navigating && (
        <View style={s.washroomPanel}>
          <Text style={s.washroomPanelTitle}>🚻 Nearby Washrooms</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {washrooms.map(w => (
              <TouchableOpacity key={w.id} style={s.washroomChip}
                onPress={() => {
                  mapRef.current?.animateCamera({ center: { latitude: w.latitude, longitude: w.longitude }, zoom: 19 }, { duration: 500 });
                  speak(`${w.name}. ${w.distance_m} meters away.`);
                }}>
                <Text style={s.washroomChipEmoji}>{washroomEmoji(w.gender)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.washroomChipName} numberOfLines={1}>{w.name}</Text>
                  <Text style={s.washroomChipDist}>{w.distance_m}m · {w.walk_minutes} min</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── OFF-CAMPUS BANNER ── */}
      {showOffCampusBanner && offCampusGate && !navigating && (
        <View style={s.offCampusBanner}>
          <View style={s.offCampusInfo}>
            <Text style={s.offCampusTitle}>📍 You're outside campus</Text>
            <Text style={s.offCampusGate}>Nearest gate: {offCampusGate.name}</Text>
            <Text style={s.offCampusDist}>{Math.round(offCampusGate.distance_to_gate_m)}m · ~{offCampusGate.estimated_walk_to_gate_minutes} min</Text>
          </View>
          <TouchableOpacity style={s.gmapsBtn} onPress={openGoogleMaps}>
            <Text style={s.gmapsBtnTxt}>Open in{'\n'}Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── RECENTER ── */}
      <TouchableOpacity style={s.recenterBtn} onPress={centerUser}>
        <Text style={s.recenterIcon}>⊕</Text>
      </TouchableOpacity>

      {/* ── ROUTE SUMMARY ── */}
      {route && !navigating && (
        <View style={s.bottomPanel}>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statVal}>{route.distance_m.toFixed(0)}m</Text><Text style={s.statLbl}>Distance</Text></View>
            <View style={s.statDiv} />
            <View style={s.stat}><Text style={s.statVal}>~{route.estimated_walk_minutes} min</Text><Text style={s.statLbl}>Walk time</Text></View>
            <View style={s.statDiv} />
            <View style={s.stat}><Text style={s.statVal}>{route.steps.length}</Text><Text style={s.statLbl}>Steps</Text></View>
          </View>
          <Text style={s.routeLabel} numberOfLines={1}>{route.start}  →  {route.end}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }} style={{ marginBottom: 14 }}>
            {route.steps.map((step, i) => (
              <TouchableOpacity key={i} style={[s.chip, i === stepIdx && s.chipActive]}
                onPress={() => { setStepIdx(i); speak(step.instruction); }}>
                <Text style={s.chipNum}>{i + 1}</Text>
                <Text style={s.chipTxt} numberOfLines={2}>{step.instruction}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.startNavBtn} onPress={startNav}>
            <Text style={s.startNavTxt}>▶  Start Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── TURN-BY-TURN NAVIGATION ── */}
      {navigating && route && (
        <>
          <View style={s.navBanner}>
            {arrived ? (
              <View style={s.arrivedRow}>
                <Text style={s.arrivedEmoji}>🎉</Text>
                <Text style={s.arrivedTxt}>You have arrived at {route.end}!</Text>
              </View>
            ) : (
              <View style={s.navRow}>
                <Text style={s.navArrow}>➡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.navInst}>{route.steps[stepIdx]?.instruction ?? 'Continue ahead'}</Text>
                  <Text style={s.navStep}>Step {stepIdx + 1} / {route.steps.length}</Text>
                </View>
                <TouchableOpacity onPress={() => speak(route.steps[stepIdx]?.instruction ?? '')} style={s.speakBtn}>
                  <Text style={{ fontSize: 24 }}>🔊</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!arrived && userCoord && route.coordinates.length > 0 && (() => {
            const dest = route.coordinates[route.coordinates.length - 1];
            const distLeft = haversineMeters(userCoord.latitude, userCoord.longitude, dest.latitude, dest.longitude);
            return (
              <View style={s.distBadge}>
                <Text style={s.distBadgeTxt}>📏 {distLeft < 1000 ? `${Math.round(distLeft)}m` : `${(distLeft / 1000).toFixed(1)}km`} to destination</Text>
              </View>
            );
          })()}

          <View style={s.navControls}>
            <View style={s.navStats}>
              <Text style={s.navStatTxt}>📏 {route.distance_m.toFixed(0)}m total</Text>
              <Text style={s.navStatTxt}>🕐 ~{route.estimated_walk_minutes} min</Text>
            </View>
            {!arrived && (
              <View style={s.navBtnRow}>
                <TouchableOpacity style={[s.navBtn, stepIdx === 0 && s.navBtnOff]} onPress={prevStep} disabled={stepIdx === 0}>
                  <Text style={s.navBtnTxt}>◀ Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.navBtn, s.navBtnBlue]} onPress={nextStep}>
                  <Text style={s.navBtnTxt}>Next ▶</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={s.stopBtn} onPress={stopNav}>
              <Text style={s.stopBtnTxt}>{arrived ? '✓  Done' : '✕  Stop Navigation'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Item 4: Suggest Location Modal ── */}
      <Modal visible={showSuggestModal} transparent animationType="slide" onRequestClose={() => setShowSuggestModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>📍 Suggest a Location</Text>
            <Text style={s.modalSub}>Your current GPS coordinates will be used</Text>

            <TextInput
              style={s.modalInput}
              placeholder="Location name (e.g. New Lab Block)"
              placeholderTextColor="#64748b"
              value={suggestName}
              onChangeText={setSuggestName}
            />

            <TextInput
              style={[s.modalInput, { height: 70 }]}
              placeholder="Description (optional)"
              placeholderTextColor="#64748b"
              value={suggestDesc}
              onChangeText={setSuggestDesc}
              multiline
            />

            <Text style={s.modalLabel}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
              {['building', 'gate', 'hostel', 'sport', 'atm', 'park', 'other'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[s.typeChip, suggestType === type && s.typeChipActive]}
                  onPress={() => setSuggestType(type)}
                >
                  <Text style={[s.typeChipTxt, suggestType === type && { color: '#fff' }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#1e293b' }]}
                onPress={() => setShowSuggestModal(false)}
              >
                <Text style={s.modalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#2563eb', flex: 1.5 }]}
                onPress={submitLocationSuggestion}
                disabled={suggestLoading}
              >
                {suggestLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalBtnTxt}>Submit for Approval</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const AT = StatusBar.currentHeight ?? 28;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  startDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff', elevation: 6 },
  nextWaypointDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#facc15', borderWidth: 2, borderColor: '#fff', elevation: 4 },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: Platform.OS === 'android' ? AT + 8 : 54, paddingHorizontal: 12, zIndex: 50 },
  card: { backgroundColor: 'rgba(10,15,30,0.96)', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#1e293b', elevation: 14, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },

  campusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  onCampus: { backgroundColor: '#14532d' },
  offCampus: { backgroundColor: '#7c2d12' },
  campusPillTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  clearPill: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  clearPillTxt: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dotLine: { alignItems: 'center', paddingVertical: 10 },
  ld: { width: 10, height: 10, borderRadius: 5 },
  ls: { width: 2, height: 24, backgroundColor: '#334155', marginVertical: 4 },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  myLocBtn: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  myLocTxt: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  washroomBtn: { flex: 1, backgroundColor: '#164e63', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#0891b2' },
  washroomBtnActive: { backgroundColor: '#0891b2', borderColor: '#22d3ee' },
  washroomBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  suggestBtn: { flex: 1, backgroundColor: '#4c1d95', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#7c3aed' },
  suggestBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  findBtn: { flex: 1.2, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  findBtnOff: { opacity: 0.4 },
  findBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

  washroomPin: { backgroundColor: '#0c4a6e', borderRadius: 20, padding: 5, borderWidth: 2, borderColor: '#0891b2', elevation: 5 },
  washroomPinEmoji: { fontSize: 20 },
  washroomCallout: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, minWidth: 180, borderWidth: 1, borderColor: '#0891b2' },
  washroomCalloutTitle: { color: '#f1f5f9', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  washroomCalloutGender: { color: '#0891b2', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  washroomCalloutDesc: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  washroomCalloutDist: { color: '#22c55e', fontSize: 12, fontWeight: '600' },

  washroomPanel: { position: 'absolute', top: Platform.OS === 'android' ? AT + 230 : 270, left: 12, right: 12, backgroundColor: 'rgba(10,15,30,0.96)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#0891b2', elevation: 14 },
  washroomPanelTitle: { color: '#0891b2', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  washroomChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c4a6e', borderRadius: 12, padding: 10, width: 180, gap: 8, borderWidth: 1, borderColor: '#0891b2' },
  washroomChipEmoji: { fontSize: 22 },
  washroomChipName: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  washroomChipDist: { color: '#7dd3fc', fontSize: 11, marginTop: 2 },

  offCampusBanner: { position: 'absolute', top: Platform.OS === 'android' ? AT + 210 : 250, left: 12, right: 12, backgroundColor: '#1c1917', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#f97316', flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 16 },
  offCampusInfo: { flex: 1 },
  offCampusTitle: { color: '#f97316', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  offCampusGate: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  offCampusDist: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  gmapsBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  gmapsBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 17 },

  recenterBtn: { position: 'absolute', right: 14, bottom: 220, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155', elevation: 8 },
  recenterIcon: { color: '#3b82f6', fontSize: 22, fontWeight: '800' },

  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0f1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 32, borderTopWidth: 1, borderColor: '#1e293b', elevation: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { color: '#3b82f6', fontSize: 20, fontWeight: '800' },
  statLbl: { color: '#475569', fontSize: 11, marginTop: 2 },
  statDiv: { width: 1, backgroundColor: '#1e293b' },
  routeLabel: { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  chip: { backgroundColor: '#1e293b', borderRadius: 12, padding: 10, width: 155, borderWidth: 1, borderColor: '#334155' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#172554' },
  chipNum: { color: '#2563eb', fontSize: 11, fontWeight: '800', marginBottom: 3 },
  chipTxt: { color: '#cbd5e1', fontSize: 12, lineHeight: 16 },
  startNavBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  startNavTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },

  navBanner: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#1d4ed8', paddingTop: Platform.OS === 'android' ? AT + 10 : 58, paddingHorizontal: 16, paddingBottom: 16, elevation: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navArrow: { fontSize: 30 },
  navInst: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  navStep: { color: '#bfdbfe', fontSize: 12, marginTop: 3 },
  speakBtn: { padding: 6 },
  arrivedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrivedEmoji: { fontSize: 32 },
  arrivedTxt: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 },

  distBadge: { position: 'absolute', top: Platform.OS === 'android' ? AT + 100 : 140, alignSelf: 'center', backgroundColor: 'rgba(10,15,30,0.9)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: '#334155' },
  distBadgeTxt: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  navControls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0f1e', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: '#1e293b', elevation: 20 },
  navStats: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 12 },
  navStatTxt: { color: '#475569', fontSize: 13, fontWeight: '600' },
  navBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  navBtn: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  navBtnBlue: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  navBtnOff: { opacity: 0.35 },
  navBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stopBtn: { backgroundColor: '#0a0f1e', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  stopBtnTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // ── Item 4: Suggest modal styles ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: '#1e293b' },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { color: '#64748b', fontSize: 12, marginBottom: 16 },
  modalLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  modalInput: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, color: '#f1f5f9', fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  typeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeChipTxt: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Item 13: Guest banner
  guestBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1e293b', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#334155', elevation: 20 },
  guestBannerTxt: { color: '#94a3b8', fontSize: 13, fontWeight: '600', flex: 1 },
  guestLoginBtn: { backgroundColor: '#2b59c3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12 },
  guestLoginBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});