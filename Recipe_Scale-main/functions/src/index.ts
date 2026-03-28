/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import express from "express";
import initFirebaseAdmin from "./firebaseAdmin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin
const admin = initFirebaseAdmin();

const app = express();
app.use(express.json());

const firestore = admin.firestore();

// List recipes
app.get("/recipes", async (req, res) => {
	try {
		const snap = await firestore.collection("recipes").get();
		const val: Record<string, any> = {};
		snap.forEach((doc) => {
			val[doc.id] = doc.data();
		});
		res.json(val);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Create recipe
app.post("/recipes", async (req, res) => {
	try {
		const data = req.body;
		const ref = await firestore.collection("recipes").add(data);
		res.status(201).json({ id: ref.id });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Get recipe by id
app.get("/recipes/:id", async (req, res) => {
	try {
		const id = req.params.id;
		const doc = await firestore.collection("recipes").doc(id).get();
		if (!doc.exists) return res.status(404).json({ error: "Not found" });
		res.json(doc.data());
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Update recipe
app.put("/recipes/:id", async (req, res) => {
	try {
		const id = req.params.id;
		const data = req.body;
		await firestore.collection("recipes").doc(id).set(data, { merge: true });
		res.json({ id });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Delete recipe
app.delete("/recipes/:id", async (req, res) => {
	try {
		const id = req.params.id;
		await firestore.collection("recipes").doc(id).delete();
		res.json({ id });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: String(err) });
	}
});

export const api = onRequest(app);
