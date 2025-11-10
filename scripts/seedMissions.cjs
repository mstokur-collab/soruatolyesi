#!/usr/bin/env node
/**
 * Seeds the `missions` collection using the provided JSON file.
 * Requires GOOGLE_APPLICATION_CREDENTIALS to point to a service account key.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const [, , inputPathArg] = process.argv;
const missionsPath = inputPathArg
    ? path.resolve(process.cwd(), inputPathArg)
    : path.resolve(__dirname, '../data/sampleMissions.json');

if (!fs.existsSync(missionsPath)) {
    console.error(`Missions file not found: ${missionsPath}`);
    process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS env variable is not set.');
    process.exit(1);
}

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();

const missions = JSON.parse(fs.readFileSync(missionsPath, 'utf-8'));

(async () => {
    for (const mission of missions) {
        if (!mission.id) {
            console.warn('Skipping mission without id:', mission);
            continue;
        }
        const docRef = db.collection('missions').doc(mission.id);
        await docRef.set(
            {
                ...mission,
                isActive: mission.isActive ?? true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        console.log(`Seeded mission ${mission.id}`);
    }
    console.log('Mission seeding completed.');
    process.exit(0);
})().catch((error) => {
    console.error('Mission seeding failed:', error);
    process.exit(1);
});
