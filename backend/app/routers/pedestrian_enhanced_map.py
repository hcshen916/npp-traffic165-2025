# 增強版行人事故地圖生成功能
from fastapi import HTTPException
from typing import Optional
import json

async def generate_enhanced_folium_map(
    year: Optional[int] = None,
    accident_type: str = "all",
    fetch_pedestrian_map_points=None
):
    """生成增強版 Folium 地圖 HTML"""
    try:
        import folium
        from folium.plugins import HeatMap, MarkerCluster
        
        # 設定台灣中心
        center_of_taiwan = [23.7, 121.0]
        m = folium.Map(
            location=center_of_taiwan,
            tiles="CartoDB positron",
            zoom_start=7,
            attr="© OpenStreetMap, CartoDB",
            width='100%',
            height='100%'
        )
        
        # 取得資料
        geojson_data = await fetch_pedestrian_map_points(year=year, accident_type=accident_type, limit=50000)
        features = geojson_data["features"]
        
        if not features:
            # 如果沒有資料，返回空地圖
            m.get_root().html.add_child(folium.Element(
                '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); '
                'background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); '
                'z-index: 9999; text-align: center;">'
                '<h3>📊 無事故資料</h3>'
                '<p>目前篩選條件下沒有找到行人事故資料</p>'
                '</div>'
            ))
            # 生成空地圖的 HTML
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
                m.save(f.name)
                
            with open(f.name, 'r', encoding='utf-8') as file:
                html_content = file.read()
                
            os.unlink(f.name)
            return {"html": html_content, "data_count": 0}
        
        # 資料預處理 - 分類事故
        all_accidents = []
        fatal_accidents = []
        vehicle_types = {
            "pedestrian": [],
            "car": [],
            "motorcycle": [],
            "truck": [],
            "bicycle": []
        }
        
        for feature in features:
            coords = feature["geometry"]["coordinates"]
            props = feature["properties"]
            lat, lng = coords[1], coords[0]
            
            accident_point = {
                "lat": lat,
                "lng": lng,
                "deaths": props.get('death_count', 0),
                "injuries": props.get('injury_count', 0),
                "is_fatal": props.get('death_count', 0) > 0,
                "vehicle_main": props.get('vehicle_main_type', ''),
                "vehicle_sub": props.get('vehicle_sub_type', ''),
                "location": props.get('location', ''),
                "datetime": props.get('occur_datetime', ''),
                "police_station": props.get('police_station', ''),
                "gender": props.get('pedestrian_gender', ''),
                "age": props.get('pedestrian_age', ''),
                "accident_type": props.get('accident_type', '')
            }
            
            all_accidents.append(accident_point)
            
            # 死亡事故
            if accident_point["is_fatal"]:
                fatal_accidents.append(accident_point)
            
            # 車種分類（簡化版）
            vehicle_main = (accident_point["vehicle_main"] or '').lower()
            vehicle_sub = (accident_point["vehicle_sub"] or '').lower()
            
            if any(keyword in vehicle_main or keyword in vehicle_sub 
                  for keyword in ['行人', '路人']):
                vehicle_types["pedestrian"].append(accident_point)
            elif any(keyword in vehicle_main or keyword in vehicle_sub 
                    for keyword in ['小客車', '自用', '計程車']):
                vehicle_types["car"].append(accident_point)
            elif any(keyword in vehicle_main or keyword in vehicle_sub 
                    for keyword in ['機車', '重型', '輕型']):
                vehicle_types["motorcycle"].append(accident_point)
            elif any(keyword in vehicle_main or keyword in vehicle_sub 
                    for keyword in ['大貨車', '客運', '遊覽車']):
                vehicle_types["truck"].append(accident_point)
            elif any(keyword in vehicle_main or keyword in vehicle_sub 
                    for keyword in ['腳踏車', '自行車']):
                vehicle_types["bicycle"].append(accident_point)
        
        # 1. 全部事故熱力圖
        def add_heat_layer(accidents, layer_name, color_gradient=None):
            if not accidents:
                return
            heat_data = [[acc["lat"], acc["lng"]] for acc in accidents]
            gradient = color_gradient or {
                0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'
            }
            HeatMap(
                heat_data,
                min_opacity=0.35,
                radius=12,
                blur=18,
                max_zoom=12,
                name=layer_name,
                gradient=gradient
            ).add_to(m)
        
        # 添加各種熱力圖層
        add_heat_layer(all_accidents, "全部事故")
        add_heat_layer(fatal_accidents, "死亡事故 (A1)", {0.2: 'darkred', 0.4: 'red', 0.6: 'orange', 0.8: 'yellow', 1.0: 'white'})
        add_heat_layer(vehicle_types["pedestrian"], "行人事故", {0.2: 'purple', 0.4: 'blue', 0.6: 'cyan', 0.8: 'lightblue', 1.0: 'white'})
        add_heat_layer(vehicle_types["car"], "小客車事故", {0.2: 'darkgreen', 0.4: 'green', 0.6: 'lightgreen', 0.8: 'yellow', 1.0: 'white'})
        add_heat_layer(vehicle_types["motorcycle"], "機車事故", {0.2: 'navy', 0.4: 'blue', 0.6: 'deepskyblue', 0.8: 'lightblue', 1.0: 'white'})
        add_heat_layer(vehicle_types["truck"], "大型車事故", {0.2: 'maroon', 0.4: 'red', 0.6: 'orange', 0.8: 'gold', 1.0: 'white'})
        add_heat_layer(vehicle_types["bicycle"], "慢車事故", {0.2: 'darkviolet', 0.4: 'violet', 0.6: 'magenta', 0.8: 'pink', 1.0: 'white'})
        
        # 2. MarkerCluster 群聚標記
        cluster = MarkerCluster(name="事故群聚 (詳細資訊)").add_to(m)
        
        for accident in all_accidents:
            popup_content = f"""
            <div style="width: 320px; font-family: Arial, sans-serif;">
                <h4 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #007cba; padding-bottom: 5px;">
                    🚗 事故詳細資訊
                </h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                    <div><strong>事故類別:</strong><br>{accident['accident_type']}</div>
                    <div><strong>發生時間:</strong><br>{accident['datetime']}</div>
                    <div style="color: #dc2626;"><strong>死亡人數:</strong><br>{accident['deaths']} 人</div>
                    <div style="color: #f59e0b;"><strong>受傷人數:</strong><br>{accident['injuries']} 人</div>
                    <div><strong>主要車種:</strong><br>{accident['vehicle_main'] or 'N/A'}</div>
                    <div><strong>車種子類:</strong><br>{accident['vehicle_sub'] or 'N/A'}</div>
                    <div><strong>行人性別:</strong><br>{accident['gender'] or 'N/A'}</div>
                    <div><strong>行人年齡:</strong><br>{accident['age'] or 'N/A'}</div>
                </div>
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee;">
                    <div style="font-size: 12px;"><strong>發生地點:</strong><br>{accident['location'] or 'N/A'}</div>
                    <div style="font-size: 12px; margin-top: 5px;"><strong>承辦警局:</strong><br>{accident['police_station'] or 'N/A'}</div>
                </div>
            </div>
            """
            
            color = '#dc2626' if accident["is_fatal"] else '#f59e0b' if accident["injuries"] > 0 else '#6b7280'
            
            folium.CircleMarker(
                location=[accident["lat"], accident["lng"]],
                radius=4,
                popup=folium.Popup(popup_content, max_width=350),
                color=color,
                fillColor=color,
                fillOpacity=0.7,
                weight=1,
                tooltip=folium.Tooltip(
                    f'事故類別: {accident["accident_type"]}<br>'
                    f'死亡/受傷: {accident["deaths"]}/{accident["injuries"]}<br>'
                    f'地點: {accident["location"][:50]}...' if len(accident["location"]) > 50 else f'地點: {accident["location"]}'
                )
            ).add_to(cluster)
        
        return m, all_accidents
        
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="Folium 套件未安裝") from exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成地圖時發生錯誤: {str(e)}") from e

def generate_enhanced_javascript(accidents, map_js_name):
    """生成增強版 JavaScript 代碼"""
    
    # 準備前端用的事故資料
    accidents_json = json.dumps([{
        "lat": acc["lat"],
        "lng": acc["lng"], 
        "deaths": acc["deaths"],
        "injuries": acc["injuries"],
        "is_fatal": acc["is_fatal"],
        "is_pedestrian": any(keyword in (acc["vehicle_main"] or '').lower() or keyword in (acc["vehicle_sub"] or '').lower() 
                           for keyword in ['行人', '路人']),
        "is_car": any(keyword in (acc["vehicle_main"] or '').lower() or keyword in (acc["vehicle_sub"] or '').lower() 
                     for keyword in ['小客車', '自用', '計程車']),
        "is_motorcycle": any(keyword in (acc["vehicle_main"] or '').lower() or keyword in (acc["vehicle_sub"] or '').lower() 
                           for keyword in ['機車', '重型', '輕型']),
        "is_truck": any(keyword in (acc["vehicle_main"] or '').lower() or keyword in (acc["vehicle_sub"] or '').lower() 
                      for keyword in ['大貨車', '客運', '遊覽車']),
        "is_bicycle": any(keyword in (acc["vehicle_main"] or '').lower() or keyword in (acc["vehicle_sub"] or '').lower() 
                        for keyword in ['腳踏車', '自行車']),
        "accident_type": acc["accident_type"]
    } for acc in accidents], ensure_ascii=False)
    
    from jinja2 import Template
    
    # JavaScript 模板
    script_template = Template("""
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            initializeEnhancedStats();
        }, 1000);
    });

    function initializeEnhancedStats() {
        var map = window["{{ map_js_name }}"];
        
        if (!map || !map._container) {
            setTimeout(initializeEnhancedStats, 500);
            return;
        }

        // 統計控制框
        var statsDiv = L.control({position: 'topright'});
        statsDiv.onAdd = function () {
            var div = L.DomUtil.create('div', 'stats-box');
            div.id = 'stats-box';
            div.style.cssText = 'background: rgba(255,255,255,0.95); padding: 15px; ' +
                               'border-radius: 10px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; ' +
                               'box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 1px solid #ddd; ' +
                               'max-width: 320px; line-height: 1.4; min-width: 280px;';
            div.innerHTML = '📊 統計載入中...';
            return div;
        };
        
        // 過濾器控制框
        var filterDiv = L.control({position: 'bottomright'});
        filterDiv.onAdd = function () {
            var div = L.DomUtil.create('div', 'filter-box');
            div.id = 'filter-box';
            div.style.cssText = 'background: rgba(255,255,255,0.95); padding: 15px; ' +
                               'border-radius: 10px; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; ' +
                               'box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 1px solid #ddd; ' +
                               'max-width: 250px; line-height: 1.3;';
            
            var filterHTML = '<div style="margin-bottom: 10px; font-weight: 600; color: #333;"><strong>🎯 統計過濾器</strong></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-all" checked onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '全部事故</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-fatal" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '死亡事故 (A1)</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-pedestrian" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '行人事故</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-car" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '小客車事故</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-motorcycle" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '機車事故</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-truck" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '大型車事故</label></div>' +
                            '<div style="margin-bottom: 6px;">' +
                            '<label><input type="checkbox" id="filter-bicycle" onchange="handleFilterChange(this)" style="margin-right: 6px;"> ' +
                            '慢車事故</label></div>';
            
            div.innerHTML = filterHTML;
            return div;
        };
        
        try {
            statsDiv.addTo(map);
            filterDiv.addTo(map);
        } catch (e) {
            console.error('無法新增控制框:', e);
        }

        var accidents = {{ accidents_json }};
        
        window.handleFilterChange = function(checkbox) {
            var allCheckbox = document.getElementById('filter-all');
            var otherCheckboxes = ['filter-fatal', 'filter-pedestrian', 'filter-car', 'filter-motorcycle', 'filter-truck', 'filter-bicycle'];
            
            if (checkbox.id === 'filter-all') {
                if (checkbox.checked) {
                    otherCheckboxes.forEach(function(id) {
                        document.getElementById(id).checked = false;
                    });
                }
            } else {
                if (checkbox.checked) {
                    allCheckbox.checked = false;
                }
            }
            updateStats();
        };

        function getActiveFilters() {
            var filters = [];
            if (document.getElementById('filter-all').checked) filters.push('all');
            if (document.getElementById('filter-fatal').checked) filters.push('fatal');
            if (document.getElementById('filter-pedestrian').checked) filters.push('pedestrian');
            if (document.getElementById('filter-car').checked) filters.push('car');
            if (document.getElementById('filter-motorcycle').checked) filters.push('motorcycle');
            if (document.getElementById('filter-truck').checked) filters.push('truck');
            if (document.getElementById('filter-bicycle').checked) filters.push('bicycle');
            return filters;
        }

        function filterAccidentsByFilters(accidents, activeFilters) {
            if (activeFilters.length === 0) return [];
            if (activeFilters.includes('all')) return accidents;
            
            return accidents.filter(function(accident) {
                return activeFilters.some(function(filter) {
                    switch (filter) {
                        case 'fatal': return accident.is_fatal;
                        case 'pedestrian': return accident.is_pedestrian;
                        case 'car': return accident.is_car;
                        case 'motorcycle': return accident.is_motorcycle;
                        case 'truck': return accident.is_truck;
                        case 'bicycle': return accident.is_bicycle;
                        default: return false;
                    }
                });
            });
        }

        function updateStats() {
            try {
                var bounds = map.getBounds();
                var activeFilters = getActiveFilters();
                
                var accidentsInView = accidents.filter(function(acc) {
                    return acc.lat && acc.lng && bounds.contains([acc.lat, acc.lng]);
                });
                
                var filteredAccidents = filterAccidentsByFilters(accidentsInView, activeFilters);
                
                var stats = {
                    total: filteredAccidents.length,
                    deaths: 0,
                    injuries: 0,
                    fatal: 0,
                    pedestrian: 0,
                    car: 0,
                    motorcycle: 0,
                    truck: 0,
                    bicycle: 0
                };

                filteredAccidents.forEach(function(acc) {
                    stats.deaths += acc.deaths || 0;
                    stats.injuries += acc.injuries || 0;
                    if (acc.is_fatal) stats.fatal += 1;
                    if (acc.is_pedestrian) stats.pedestrian += 1;
                    if (acc.is_car) stats.car += 1;
                    if (acc.is_motorcycle) stats.motorcycle += 1;
                    if (acc.is_truck) stats.truck += 1;
                    if (acc.is_bicycle) stats.bicycle += 1;
                });

                var statsBox = document.getElementById('stats-box');
                if (statsBox) {
                    var content = '<div style="margin-bottom: 10px; font-weight: 600; color: #333;"><strong>📍 目前視窗範圍統計</strong></div>';
                    
                    if (activeFilters.length > 0 && !activeFilters.includes('all')) {
                        var filterNames = {
                            'fatal': '死亡事故', 'pedestrian': '行人', 'car': '小客車', 
                            'motorcycle': '機車', 'truck': '大型車', 'bicycle': '慢車'
                        };
                        var filterLabels = activeFilters.map(f => filterNames[f] || f).join(', ');
                        content += '<div style="margin-bottom: 8px; font-size: 11px; color: #666; padding: 4px 8px; background: #f0f9ff; border-radius: 4px;">🎯 過濾器: ' + filterLabels + '</div>';
                    }
                    
                    content += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">';
                    content += '<div style="padding: 8px; background: #f8fafc; border-radius: 6px; text-align: center;">';
                    content += '<div style="font-size: 18px; font-weight: bold; color: #007cba;">' + stats.total + '</div>';
                    content += '<div style="font-size: 11px; color: #666;">事故總計</div></div>';
                    
                    content += '<div style="padding: 8px; background: #fef2f2; border-radius: 6px; text-align: center;">';
                    content += '<div style="font-size: 18px; font-weight: bold; color: #dc2626;">' + stats.deaths + '</div>';
                    content += '<div style="font-size: 11px; color: #666;">死亡人數</div></div>';
                    content += '</div>';
                    
                    content += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">';
                    content += '<div style="padding: 8px; background: #fffbeb; border-radius: 6px; text-align: center;">';
                    content += '<div style="font-size: 18px; font-weight: bold; color: #f59e0b;">' + stats.injuries + '</div>';
                    content += '<div style="font-size: 11px; color: #666;">受傷人數</div></div>';
                    
                    if (stats.fatal > 0) {
                        content += '<div style="padding: 8px; background: #fef2f2; border-radius: 6px; text-align: center;">';
                        content += '<div style="font-size: 18px; font-weight: bold; color: #dc2626;">' + stats.fatal + '</div>';
                        content += '<div style="font-size: 11px; color: #666;">A1事故</div></div>';
                    }
                    content += '</div>';
                    
                    // 車種統計
                    if (stats.pedestrian + stats.car + stats.motorcycle + stats.truck + stats.bicycle > 0) {
                        content += '<div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">';
                        content += '<div style="font-size: 11px; color: #666; margin-bottom: 6px;">車種分布:</div>';
                        content += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">';
                        
                        if (stats.pedestrian > 0) content += '<div>👤 行人: <strong>' + stats.pedestrian + '</strong></div>';
                        if (stats.car > 0) content += '<div>🚗 小客車: <strong>' + stats.car + '</strong></div>';
                        if (stats.motorcycle > 0) content += '<div>🏍️ 機車: <strong>' + stats.motorcycle + '</strong></div>';
                        if (stats.truck > 0) content += '<div>🚛 大型車: <strong>' + stats.truck + '</strong></div>';
                        if (stats.bicycle > 0) content += '<div>🚲 慢車: <strong>' + stats.bicycle + '</strong></div>';
                        
                        content += '</div></div>';
                    }
                    
                    statsBox.innerHTML = content;
                }
            } catch (e) {
                console.error('更新統計時發生錯誤:', e);
            }
        }

        map.on('moveend zoomend', updateStats);
        updateStats();
        console.log('增強版統計面板已初始化完成');
    }
    """)
    
    return script_template.render(
        accidents_json=accidents_json,
        map_js_name=map_js_name
    )
