import { get, push, ref, set } from 'firebase/database';
import { db } from '../firebase';
import { hotelData } from '../hoteldata';

/**
 * Migrate hardcoded hotel data from hoteldata.ts to Firebase on first run.
 * - Uses `app_metadata/hotels_migrated` flag to avoid duplicate runs.
 * - Accepts flexible `koordinat` formats on each hotel (string, [lat,lon], {latitude,longitude}).
 * - Validates coordinates and falls back to a safe default center if necessary.
 */
export const migrateHotelDataToFirebase = async () => {
  try {
    const migrationRef = ref(db, 'app_metadata/hotels_migrated');
    const pointsRef = ref(db, 'points');

    // Check if points already has data (actual data, not just flag)
    const existingPointsSnapshot = await get(pointsRef);
    const existingNames = existingPointsSnapshot.exists()
      ? Object.values(existingPointsSnapshot.val()).map((p: any) => p.name)
      : [];

    // If 17 hotels already in points, skip
    if (existingNames.length >= 17) {
      console.log(`Hotels already migrated (${existingNames.length} found), skipping...`);
      return;
    }

    console.log('Starting hotel data migration to Firebase...');

    // Default coords (Yogyakarta center) as string "lat,lon"
    const defaultCoords = '-7.797,110.370';

    let migratedCount = 0;

    for (const [hotelName, hotelInfo] of Object.entries(hotelData)) {
      try {
        if (existingNames.includes(hotelName)) {
          console.log(`Skipping duplicate: ${hotelName}`);
          continue;
        }

        // Determine coordinates: support multiple formats
        let coords = defaultCoords;
        const tryParseCoords = (raw: any) => {
          if (!raw) return null;
          if (typeof raw === 'string') return raw.trim();
          if (Array.isArray(raw) && raw.length >= 2) return `${Number(raw[0])},${Number(raw[1])}`;
          if (typeof raw === 'object' && raw.latitude != null && raw.longitude != null) return `${Number(raw.latitude)},${Number(raw.longitude)}`;
          return null;
        };

        // priority: hotelInfo.koordinat -> hotelInfo.coordinates -> hotelInfo.latitude/longitude
        const rawCoord = (hotelInfo as any).koordinat || (hotelInfo as any).coordinates || (hotelInfo as any).coord;
        const parsedFromRaw = tryParseCoords(rawCoord);
        if (parsedFromRaw) coords = parsedFromRaw;
        else if ((hotelInfo as any).latitude != null && (hotelInfo as any).longitude != null) {
          coords = `${Number((hotelInfo as any).latitude)},${Number((hotelInfo as any).longitude)}`;
        }

        // Validate coords are numeric
        const [lat, lon] = coords.split(',').map(Number);
        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`Invalid coordinates for ${hotelName}, using default.`);
          coords = defaultCoords;
        }

        const newPointRef = push(pointsRef);
        const pointData = {
          name: hotelName,
          coordinates: coords,
          accuration: (hotelInfo as any).accuration || '100 m',
          bintang: Number((hotelInfo as any).bintang) || 3,
          alamat: (hotelInfo as any).alamat || '',
          deskripsi: (hotelInfo as any).deskripsi || '',
          website: (hotelInfo as any).website || null,
          sections: (hotelInfo as any).sections || null,
        };

        await set(newPointRef, pointData);
        migratedCount++;
        console.log(`Migrated: ${hotelName}`);
      } catch (innerErr) {
        console.error(`Failed migrating ${hotelName}:`, innerErr);
        // continue with next hotel
      }
    }

    // Mark migration as done (only after attempting all items)
    await set(migrationRef, true);
    console.log(`✓ Hotel migration complete: ${migratedCount} hotels added`);

    // Log final count in Firebase
    console.log(`✓ Total hotels in points/: ${existingNames.length + migratedCount}`);
  } catch (error) {
    console.error('Error during hotel data migration:', error);
    // Do not re-throw to avoid blocking app startup
  }
};
