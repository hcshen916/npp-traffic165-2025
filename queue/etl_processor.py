import os
import pandas as pd
import requests
from urllib.parse import urlparse
from datetime import datetime
import pymysql
import tempfile
import json


def download_file(url: str) -> str:
    """Download file from URL and return local path"""
    if url.startswith('file://'):
        return url[7:]  # Remove file:// prefix
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
        for chunk in response.iter_content(chunk_size=8192):
            tmp.write(chunk)
        return tmp.name


def get_db_connection():
    """Get MySQL connection"""
    return pymysql.connect(
        host=os.getenv('MYSQL_HOST', 'mysql'),
        port=int(os.getenv('MYSQL_PORT', '3306')),
        user=os.getenv('MYSQL_USER', 'traffic'),
        password=os.getenv('MYSQL_PASSWORD', 'changeme'),
        database='traffic',
        charset='utf8mb4'
    )


def clean_accident_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and standardize accident data"""
    print(f"Processing {len(df)} rows")
    
    # Basic cleaning
    df = df.dropna(subset=['lat', 'lng'])
    
    # Ensure required columns exist with defaults
    required_columns = {
        'severity': 'fatal',
        'victim_type': '未知',
        'age_group': '未知', 
        'vehicle_type': '未知',
        'cause_primary': '未知',
        'cause_primary_rank': 1,
        'accident_category': '未知',
        'road_segment_id': None
    }
    
    for col, default in required_columns.items():
        if col not in df.columns:
            df[col] = default
    
    # Convert coordinates to float
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lng'] = pd.to_numeric(df['lng'], errors='coerce')
    
    # Filter valid Taiwan coordinates (rough bounds)
    df = df[
        (df['lat'].between(21.8, 25.4)) & 
        (df['lng'].between(119.5, 122.1))
    ]
    
    # Ensure occur_dt is datetime
    if 'occur_dt' not in df.columns:
        df['occur_dt'] = datetime.now()
    else:
        df['occur_dt'] = pd.to_datetime(df['occur_dt'], errors='coerce')
        df = df.dropna(subset=['occur_dt'])
    
    print(f"After cleaning: {len(df)} rows")
    return df


def insert_accident_data(df: pd.DataFrame, year: int, month: int = None):
    """Insert accident data into MySQL"""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Delete existing data for the period (if doing replace)
            if month:
                cursor.execute(
                    "DELETE FROM accident WHERE YEAR(occur_dt) = %s AND MONTH(occur_dt) = %s",
                    (year, month)
                )
            else:
                cursor.execute(
                    "DELETE FROM accident WHERE YEAR(occur_dt) = %s",
                    (year,)
                )
            
            # Insert new data
            insert_sql = """
                INSERT INTO accident (
                    occur_dt, lat, lng, severity, victim_type, age_group,
                    vehicle_type, cause_primary, cause_primary_rank,
                    accident_category, road_segment_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            data_to_insert = []
            for _, row in df.iterrows():
                data_to_insert.append((
                    row['occur_dt'],
                    row['lat'],
                    row['lng'], 
                    row['severity'],
                    row['victim_type'],
                    row['age_group'],
                    row['vehicle_type'],
                    row['cause_primary'],
                    row['cause_primary_rank'],
                    row['accident_category'],
                    row['road_segment_id']
                ))
            
            cursor.executemany(insert_sql, data_to_insert)
            connection.commit()
            
            print(f"Inserted {len(data_to_insert)} accident records")
            return len(data_to_insert)
            
    finally:
        connection.close()


def update_segment_stats(year: int):
    """Update segment statistics after data insert"""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Clear existing stats for the year
            cursor.execute("DELETE FROM segment_stats WHERE year = %s", (year,))
            
            # Recalculate segment stats
            cursor.execute("""
                INSERT INTO segment_stats (road_segment_id, year, county, fatal_count)
                SELECT 
                    road_segment_id,
                    %s as year,
                    '未知' as county,
                    COUNT(*) as fatal_count
                FROM accident 
                WHERE YEAR(occur_dt) = %s 
                    AND severity = 'fatal'
                    AND road_segment_id IS NOT NULL
                GROUP BY road_segment_id
            """, (year, year))
            
            connection.commit()
            print(f"Updated segment stats for year {year}")
            
    finally:
        connection.close()


def process_accident_data(payload: dict):
    """Main ETL processing function"""
    try:
        print(f"Starting ETL processing: {payload}")
        
        # Download file
        file_path = download_file(payload['file_url'])
        
        # Read and process data
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.json', '.geojson')):
            with open(file_path, 'r') as f:
                data = json.load(f)
            if 'features' in data:  # GeoJSON
                df = pd.json_normalize(data['features'])
                # Flatten geometry coordinates
                if 'geometry.coordinates' in df.columns:
                    df['lng'] = df['geometry.coordinates'].apply(lambda x: x[0] if x else None)
                    df['lat'] = df['geometry.coordinates'].apply(lambda x: x[1] if x else None)
            else:
                df = pd.json_normalize(data)
        else:
            raise ValueError(f"Unsupported file format: {file_path}")
        
        # Clean data
        df_clean = clean_accident_data(df)
        
        # Insert into database
        inserted_count = insert_accident_data(
            df_clean, 
            payload['year'], 
            payload.get('month')
        )
        
        # Update segment statistics
        update_segment_stats(payload['year'])
        
        # Clean up temp file
        if payload['file_url'].startswith('file://'):
            os.unlink(file_path)
        
        result = {
            "success": True,
            "processed_rows": len(df),
            "inserted_rows": inserted_count,
            "year": payload['year'],
            "month": payload.get('month'),
            "source": payload.get('source', 'unknown'),
            "processed_at": datetime.now().isoformat()
        }
        
        print(f"ETL completed successfully: {result}")
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "payload": payload,
            "failed_at": datetime.now().isoformat()
        }
        print(f"ETL failed: {error_result}")
        raise e
