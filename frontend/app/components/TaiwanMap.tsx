'use client'

import { useEffect, useRef, useState } from 'react'

interface TaiwanMapProps {
  category?: string
  year?: number
  onCategoryChange?: (category: string) => void
}

export default function TaiwanMap({ 
  category = 'all', 
  year = 2024, 
  onCategoryChange 
}: TaiwanMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Dynamic import for client-side only
    import('maplibre-gl').then((maplibreModule) => {
      // Also import CSS dynamically
      import('maplibre-gl/dist/maplibre-gl.css')
      
      const maplibregl = maplibreModule.default || maplibreModule
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        },
        center: [120.9738, 23.9739], // Taiwan center
        zoom: 7
      })

      map.current.on('load', () => {
        setIsLoaded(true)
      })
    }).catch((error) => {
      console.error('Failed to load maplibre:', error)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!map.current || !isLoaded) return

    const loadMapData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const response = await fetch(
          `${apiBase}/map/points?category=${category}&year=${year}&limit=5000`
        )
        const data = await response.json()

        // Remove existing source and layers
        if (map.current!.getSource('accidents')) {
          if (map.current!.getLayer('accidents-heat')) {
            map.current!.removeLayer('accidents-heat')
          }
          if (map.current!.getLayer('accidents-circle')) {
            map.current!.removeLayer('accidents-circle')
          }
          map.current!.removeSource('accidents')
        }

        // Add new data
        map.current!.addSource('accidents', {
          type: 'geojson',
          data: data,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        })

        // Add heatmap layer
        map.current!.addLayer({
          id: 'accidents-heat',
          type: 'heatmap',
          source: 'accidents',
          maxzoom: 15,
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': {
              stops: [
                [11, 1],
                [15, 3]
              ]
            },
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': {
              stops: [
                [11, 15],
                [15, 20]
              ]
            }
          }
        })

        // Add circle layer for higher zoom levels
        map.current!.addLayer({
          id: 'accidents-circle',
          type: 'circle',
          source: 'accidents',
          minzoom: 14,
          paint: {
            'circle-color': [
              'case',
              ['has', 'point_count'],
              '#51bbd6',
              '#ff6b6b'
            ],
            'circle-radius': [
              'case',
              ['has', 'point_count'],
              ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
              6
            ]
          }
        })

        // Add click handler for individual points (dynamic maplibre)
        map.current!.on('click', 'accidents-circle', async (e) => {
          if (e.features && e.features[0]) {
            const feature = e.features[0]
            const properties = feature.properties || {}
            
            const maplibreModule = await import('maplibre-gl')
            const maplibregl = maplibreModule.default || maplibreModule
            
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="font-size: 12px;">
                  <strong>事故資訊</strong><br/>
                  類別: ${properties.category || 'N/A'}<br/>
                  受害者: ${properties.victim_type || 'N/A'}<br/>
                  時間: ${properties.occur_dt ? new Date(properties.occur_dt).toLocaleDateString() : 'N/A'}
                </div>
              `)
              .addTo(map.current!)
          }
        })

        // Change cursor on hover
        map.current!.on('mouseenter', 'accidents-circle', () => {
          map.current!.getCanvas().style.cursor = 'pointer'
        })

        map.current!.on('mouseleave', 'accidents-circle', () => {
          map.current!.getCanvas().style.cursor = ''
        })

      } catch (error) {
        console.error('Failed to load map data:', error)
      }
    }

    loadMapData()
  }, [category, year, isLoaded])

  const categories = [
    { value: 'all', label: '全部' },
    { value: '未禮讓行人', label: '未禮讓行人' },
    { value: '超速', label: '超速' },
    { value: '酒駕', label: '酒駕' },
    { value: '闖紅燈', label: '闖紅燈' }
  ]

  return (
    <div className="relative w-full h-full">
      {/* Category filter */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">事故類別篩選</div>
        <select
          value={category}
          onChange={(e) => onCategoryChange?.(e.target.value)}
          className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500">載入地圖中...</div>
        </div>
      )}
    </div>
  )
}
