'use client'

import { useEffect, useRef, useState } from 'react'

interface PedestrianMapProps {
  year?: number
  accidentType?: string
}

export default function PedestrianMap({ 
  year, 
  accidentType = 'all'
}: PedestrianMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [accidentTypes, setAccidentTypes] = useState<Array<{type: string, count: number}>>([])
  const [selectedYear, setSelectedYear] = useState<number | undefined>(year)
  const [selectedType, setSelectedType] = useState(accidentType)
  const [dataCount, setDataCount] = useState(0)

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
              tiles: ['https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap, CartoDB'
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
        center: [121.0, 23.7], // Taiwan center
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

  // Load available years and accident types
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        
        // Load years
        const yearsResponse = await fetch(`${apiBase}/pedestrian/years`)
        const yearsData = await yearsResponse.json()
        setAvailableYears(yearsData.years || [])
        
        // Load accident types
        const typesResponse = await fetch(`${apiBase}/pedestrian/accident-types`)
        const typesData = await typesResponse.json()
        setAccidentTypes(typesData.accident_types || [])
        
      } catch (error) {
        console.error('Failed to load filter options:', error)
      }
    }

    loadFilters()
  }, [])

  useEffect(() => {
    if (!map.current || !isLoaded) return

    const loadMapData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const params = new URLSearchParams()
        
        if (selectedYear) {
          params.append('year', selectedYear.toString())
        }
        if (selectedType !== 'all') {
          params.append('accident_type', selectedType)
        }
        params.append('limit', '10000')

        const response = await fetch(`${apiBase}/pedestrian/map/points?${params}`)
        const data = await response.json()

        // Remove existing source and layers
        if (map.current!.getSource('pedestrian-accidents')) {
          ['pedestrian-heat', 'pedestrian-circle', 'pedestrian-cluster', 'pedestrian-cluster-count'].forEach(layerId => {
            if (map.current!.getLayer(layerId)) {
              map.current!.removeLayer(layerId)
            }
          })
          map.current!.removeSource('pedestrian-accidents')
        }

        // Add new data
        map.current!.addSource('pedestrian-accidents', {
          type: 'geojson',
          data: data,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        })

        // Add heatmap layer
        map.current!.addLayer({
          id: 'pedestrian-heat',
          type: 'heatmap',
          source: 'pedestrian-accidents',
          maxzoom: 15,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'death_count'],
              0, 0.5,
              1, 1.0
            ],
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

        // Add cluster layer
        map.current!.addLayer({
          id: 'pedestrian-cluster',
          type: 'circle',
          source: 'pedestrian-accidents',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',
              100, '#f1f075',
              750, '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100, 30,
              750, 40
            ]
          }
        })

        // Add cluster count
        map.current!.addLayer({
          id: 'pedestrian-cluster-count',
          type: 'symbol',
          source: 'pedestrian-accidents',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          }
        })

        // Add individual points
        map.current!.addLayer({
          id: 'pedestrian-circle',
          type: 'circle',
          source: 'pedestrian-accidents',
          filter: ['!', ['has', 'point_count']],
          minzoom: 14,
          paint: {
            'circle-color': [
              'case',
              ['>', ['get', 'death_count'], 0], '#dc2626', // red for fatal
              ['>', ['get', 'injury_count'], 0], '#f59e0b', // amber for injury
              '#6b7280' // gray for others
            ],
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 5,
              18, 10
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          }
        })

        // Click handlers
        map.current!.on('click', 'pedestrian-cluster', async (e) => {
          const features = map.current!.queryRenderedFeatures(e.point, {
            layers: ['pedestrian-cluster']
          })
          const clusterId = features[0].properties.cluster_id
          const zoom = await map.current!.getSource('pedestrian-accidents').getClusterExpansionZoom(clusterId)
          
          map.current!.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          })
        })

        map.current!.on('click', 'pedestrian-circle', async (e) => {
          if (e.features && e.features[0]) {
            const feature = e.features[0]
            const properties = feature.properties || {}
            
            const maplibreModule = await import('maplibre-gl')
            const maplibregl = maplibreModule.default || maplibreModule
            
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="font-size: 12px; max-width: 300px;">
                  <h4 style="margin: 0 0 8px 0; font-weight: bold;">事故詳細資訊</h4>
                  <p><strong>事故類別：</strong>${properties.accident_type || 'N/A'}</p>
                  <p><strong>發生時間：</strong>${properties.occur_datetime || 'N/A'}</p>
                  <p><strong>死亡人數：</strong><span style="color: #dc2626;">${properties.death_count || 0}</span></p>
                  <p><strong>受傷人數：</strong><span style="color: #f59e0b;">${properties.injury_count || 0}</span></p>
                  <p><strong>車種大類：</strong>${properties.vehicle_main_type || 'N/A'}</p>
                  <p><strong>車種子類：</strong>${properties.vehicle_sub_type || 'N/A'}</p>
                  <p><strong>行人性別：</strong>${properties.pedestrian_gender || 'N/A'}</p>
                  <p><strong>行人年齡：</strong>${properties.pedestrian_age || 'N/A'}</p>
                  <p><strong>發生地點：</strong>${properties.location || 'N/A'}</p>
                  <p><strong>承辦警局：</strong>${properties.police_station || 'N/A'}</p>
                </div>
              `)
              .addTo(map.current!)
          }
        })

        // Cursor change on hover
        map.current!.on('mouseenter', 'pedestrian-cluster', () => {
          map.current!.getCanvas().style.cursor = 'pointer'
        })

        map.current!.on('mouseleave', 'pedestrian-cluster', () => {
          map.current!.getCanvas().style.cursor = ''
        })

        map.current!.on('mouseenter', 'pedestrian-circle', () => {
          map.current!.getCanvas().style.cursor = 'pointer'
        })

        map.current!.on('mouseleave', 'pedestrian-circle', () => {
          map.current!.getCanvas().style.cursor = ''
        })

        // Update data count
        setDataCount(data.features?.length || 0)

      } catch (error) {
        console.error('Failed to load map data:', error)
      }
    }

    loadMapData()
  }, [selectedYear, selectedType, isLoaded])

  return (
    <div className="relative w-full h-full">
      {/* Filter controls */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年份篩選</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部年份</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">事故類型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部類型</option>
              {accidentTypes.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.type} ({type.count})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t">
            <div className="text-sm text-gray-600">
              顯示資料點：{dataCount} 筆
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">圖例說明</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
            <span>死亡事故</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
            <span>受傷事故</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span>其他事故</span>
          </div>
          <div className="pt-1 border-t text-gray-600">
            熱力圖：事故密集區域
          </div>
        </div>
      </div>

      {/* Back to upload button */}
      <div className="absolute top-4 right-4 z-10">
        <a
          href="/dashboard/pedestrian-upload"
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          回到上傳頁面
        </a>
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
