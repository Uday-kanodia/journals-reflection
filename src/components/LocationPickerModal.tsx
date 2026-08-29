import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, X, Check, Globe, AlertCircle } from 'lucide-react';
import { JournalLocation } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: JournalLocation) => void;
  currentLocation?: JournalLocation;
}

// Preset inspiring journaling spots & quick cities for fast prototyping
const QUICK_PRESETS = [
  { placeName: 'Kyoto Zen Gardens', formattedAddress: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681 },
  { placeName: 'Sausalito Harbor View', formattedAddress: 'Sausalito, CA, USA', lat: 37.8591, lng: -122.4853 },
  { placeName: 'Central Park Conservatory', formattedAddress: 'New York, NY, USA', lat: 40.7829, lng: -73.9654 },
  { placeName: 'Zurich Lakefront', formattedAddress: 'Zurich, Switzerland', lat: 47.3769, lng: 8.5417 },
  { placeName: 'Big Sur Coastal Bluff', formattedAddress: 'Highway 1, CA, USA', lat: 36.2704, lng: -121.8081 },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState(currentLocation?.placeName || '');
  const [addressInput, setAddressInput] = useState(currentLocation?.formattedAddress || '');
  const [lat, setLat] = useState<number>(currentLocation?.lat || 37.7749);
  const [lng, setLng] = useState<number>(currentLocation?.lng || -122.4194);
  const [notes, setNotes] = useState(currentLocation?.notes || '');
  const [isLocating, setIsLocating] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize or update interactive Google Maps if API key is provided
  useEffect(() => {
    if (!isOpen) return;

    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      // Graceful fallback to rich interactive coordinate visualizer if key not set
      setIsMapLoaded(true);
      return;
    }

    let isCancelled = false;

    async function loadGoogleMap() {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader: any = new (Loader as any)({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'marker'],
        });

        await loader.importLibrary('maps');
        await loader.importLibrary('marker');
        if (isCancelled || !mapContainerRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat, lng },
          zoom: 14,
          mapId: 'DEMO_MAP_ID',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        };

        // Pass mandatory usage attribution identifier
        (mapOptions as any).internalUsageAttributionIds = ['gmp_mcp_codeassist_v1_aistudio'];

        const map = new google.maps.Map(mapContainerRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Use modern AdvancedMarkerElement
        const { AdvancedMarkerElement } = (await google.maps.importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat, lng },
          title: searchQuery || 'Journal Reflection Point',
        });
        markerRef.current = marker;

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setLat(newLat);
            setLng(newLng);
            marker.position = { lat: newLat, lng: newLng };
            if (!searchQuery) {
              setSearchQuery(`Pinned Point (${newLat.toFixed(3)}, ${newLng.toFixed(3)})`);
            }
          }
        });

        setIsMapLoaded(true);
      } catch (err: any) {
        console.warn('[Google Maps Loader Warning]:', err);
        setMapError(err?.message || 'Could not load Google Maps SDK');
        setIsMapLoaded(true);
      }
    }

    loadGoogleMap();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setSearchQuery('Current Location');
        setAddressInput(`GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: userLat, lng: userLng });
        }
        if (markerRef.current) {
          markerRef.current.position = { lat: userLat, lng: userLng };
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not retrieve current location.');
      },
      { timeout: 8000 }
    );
  };

  const handleSelectPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSearchQuery(preset.placeName);
    setAddressInput(preset.formattedAddress);
    setLat(preset.lat);
    setLng(preset.lng);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: preset.lat, lng: preset.lng });
      mapInstanceRef.current.setZoom(14);
    }
    if (markerRef.current) {
      markerRef.current.position = { lat: preset.lat, lng: preset.lng };
    }
  };

  const handleSave = () => {
    if (!searchQuery.trim()) {
      alert('Please enter a location name or select a point.');
      return;
    }

    const location: JournalLocation = {
      placeName: searchQuery.trim(),
      formattedAddress: addressInput.trim() || undefined,
      lat,
      lng,
      notes: notes.trim() || undefined,
    };

    onSelectLocation(location);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-50 border border-stone-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-100/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-olive-700/10 text-olive-800">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Pin Location to Reflection</h3>
              <p className="text-xs text-stone-500">Anchor your introspective thoughts to a meaningful place</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Search / Location Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="E.g., Kyoto Zen Temple, Sausalito Pier, or Home Sanctuary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-olive-600/30 focus:border-olive-600 transition-all shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="px-3.5 py-2.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                title="Use Current GPS Coordinates"
              >
                <Navigation className={`w-4 h-4 text-olive-700 ${isLocating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Current GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Optional Address or Landmark..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-olive-600 shadow-xs"
              />
              <input
                type="text"
                placeholder="Atmospheric notes (e.g. Rainy morning, cafe buzz)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-olive-600 shadow-xs"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block mb-2">
              Inspiring Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.placeName}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    searchQuery === preset.placeName
                      ? 'bg-olive-800 text-stone-100 border-olive-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  📍 {preset.placeName}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Visualizer / Google Map Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-medium flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-olive-700" /> Geographic Pin Coordinates
              </span>
              <span className="font-mono text-[11px] bg-stone-200/60 px-2 py-0.5 rounded">
                Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
              </span>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-52 bg-stone-200 rounded-xl border border-stone-300 relative overflow-hidden flex items-center justify-center shadow-inner"
            >
              {/* Fallback stylized visual map canvas if Google Maps SDK is loading or in demo mode */}
              <div className="absolute inset-0 bg-gradient-to-tr from-stone-200 via-stone-100 to-emerald-50/40 opacity-80 pointer-events-none" />
              
              {/* Geometric topographic contours */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#5a5a40_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex flex-col items-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-olive-800 text-white flex items-center justify-center shadow-lg animate-bounce mb-2 border-2 border-white">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="font-serif font-semibold text-stone-900 text-sm">
                  {searchQuery || 'Pinned Reflection Location'}
                </p>
                <p className="text-xs text-stone-500 max-w-sm mt-0.5">
                  {addressInput || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-100/70 flex items-center justify-between">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Google Maps Platform Grounded</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-olive-800 hover:bg-olive-900 text-stone-50 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
