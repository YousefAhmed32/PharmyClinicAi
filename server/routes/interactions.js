const express        = require('express');
const router         = express.Router();
const DrugInteraction = require('../models/DrugInteraction');
const { protect, restrictTo } = require('../middlewares/auth');
const { ApiError }   = require('../middlewares/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');

// ── Helpers ───────────────────────────────────────────────────────────────
const normalize = (name) => name.trim().toLowerCase();

/**
 * Generate all unique pairs from an array
 * e.g. [A, B, C] → [[A,B],[A,C],[B,C]]
 */
const getPairs = (arr) => {
  const pairs = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      pairs.push([arr[i], arr[j]]);
  return pairs;
};

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC — check interactions
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/interactions/check
 * Body: { drugs: ["warfarin", "aspirin", "ibuprofen"] }
 * Returns all interactions found between these drugs
 */
router.post('/check', async (req, res, next) => {
  try {
    const { drugs } = req.body;
    if (!Array.isArray(drugs) || drugs.length < 2) {
      return next(new ApiError(400, 'Provide at least 2 drug names'));
    }

    const normalized = drugs.map(normalize);
    const pairs      = getPairs(normalized);

    // Query all pairs (order-independent)
    const interactions = await Promise.all(
      pairs.map(([d1, d2]) =>
        DrugInteraction.findOne({
          $or: [
            { drug1: d1, drug2: d2 },
            { drug1: d2, drug2: d1 },
          ],
        })
      )
    );

    const found = interactions.filter(Boolean);

    const summary = {
      checked:     drugs.length,
      pairs:       pairs.length,
      interactions: found.length,
      high:         found.filter(i => i.severity === 'high').length,
      moderate:     found.filter(i => i.severity === 'moderate').length,
      low:          found.filter(i => i.severity === 'low').length,
      safe:         found.length === 0,
    };

    return sendSuccess(res, 200, 'Interaction check complete', {
      summary,
      interactions: found,
      drugs: normalized,
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/interactions/drug/:name
 * All interactions for a specific drug
 */
router.get('/drug/:name', async (req, res, next) => {
  try {
    const name = normalize(req.params.name);
    const interactions = await DrugInteraction.find({
      $or: [{ drug1: name }, { drug2: name }],
    }).sort({ severity: -1 });

    return sendSuccess(res, 200, `Interactions for "${name}"`, interactions);
  } catch (err) { next(err); }
});

/**
 * GET /api/interactions
 * Paginated list of all interactions (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, severity, search } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (search) {
      const q = normalize(search);
      filter.$or = [{ drug1: { $regex: q } }, { drug2: { $regex: q } }];
    }
    const skip = (page - 1) * limit;
    const [interactions, total] = await Promise.all([
      DrugInteraction.find(filter).sort({ severity: -1, drug1: 1 }).skip(skip).limit(Number(limit)),
      DrugInteraction.countDocuments(filter),
    ]);
    return sendSuccess(res, 200, 'Interactions retrieved', interactions, {
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
// ADMIN — manage interactions database
// ─────────────────────────────────────────────────────────────────────────

// POST /api/interactions — add interaction
router.post('/', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { drug1, drug2, severity, description, recommendation, mechanism } = req.body;
    if (!drug1 || !drug2 || !severity || !description)
      return next(new ApiError(400, 'drug1, drug2, severity, description are required'));

    const d1 = normalize(drug1);
    const d2 = normalize(drug2);

    if (d1 === d2) return next(new ApiError(400, 'drug1 and drug2 must be different'));

    // Always store alphabetically for consistency
    const [sorted1, sorted2] = [d1, d2].sort();

    const existing = await DrugInteraction.findOne({ drug1: sorted1, drug2: sorted2 });
    if (existing) return next(new ApiError(409, `Interaction already exists: ${sorted1} ↔ ${sorted2}`));

    const interaction = await DrugInteraction.create({
      drug1: sorted1, drug2: sorted2, severity, description, recommendation, mechanism,
    });
    return sendSuccess(res, 201, 'Interaction added', interaction);
  } catch (err) { next(err); }
});

// PUT /api/interactions/:id — update
router.put('/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { severity, description, recommendation, mechanism } = req.body;
    const updated = await DrugInteraction.findByIdAndUpdate(
      req.params.id,
      { severity, description, recommendation, mechanism },
      { new: true, runValidators: true }
    );
    if (!updated) return next(new ApiError(404, 'Interaction not found'));
    return sendSuccess(res, 200, 'Updated', updated);
  } catch (err) { next(err); }
});

// DELETE /api/interactions/:id
router.delete('/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const deleted = await DrugInteraction.findByIdAndDelete(req.params.id);
    if (!deleted) return next(new ApiError(404, 'Interaction not found'));
    return sendSuccess(res, 200, 'Deleted');
  } catch (err) { next(err); }
});

// POST /api/interactions/seed-common — seed common interactions
router.post('/seed-common', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const COMMON = [
      { drug1:'warfarin',    drug2:'aspirin',      severity:'high',     description:'Increased bleeding risk. Combined use significantly raises hemorrhage risk.', recommendation:'Avoid combination or monitor INR closely.' },
      { drug1:'warfarin',    drug2:'ibuprofen',    severity:'high',     description:'NSAIDs increase anticoagulant effect of warfarin and risk of GI bleeding.', recommendation:'Use paracetamol instead if pain relief needed.' },
      { drug1:'metformin',   drug2:'alcohol',      severity:'high',     description:'Risk of lactic acidosis increases significantly with alcohol use.', recommendation:'Avoid alcohol while taking metformin.' },
      { drug1:'simvastatin', drug2:'erythromycin', severity:'high',     description:'Erythromycin inhibits CYP3A4, increasing simvastatin levels and myopathy risk.', recommendation:'Use alternative antibiotic or switch statin.' },
      { drug1:'aspirin',     drug2:'ibuprofen',    severity:'moderate', description:'Ibuprofen may reduce the cardioprotective effect of aspirin.', recommendation:'Take aspirin at least 30 minutes before ibuprofen.' },
      { drug1:'lisinopril',  drug2:'potassium',    severity:'moderate', description:'ACE inhibitors increase potassium levels; combined with potassium supplements may cause hyperkalemia.', recommendation:'Monitor serum potassium levels regularly.' },
      { drug1:'metronidazole',drug2:'alcohol',     severity:'high',     description:'Causes severe disulfiram-like reaction: nausea, vomiting, flushing, headache.', recommendation:'Strictly avoid alcohol during and 48h after treatment.' },
      { drug1:'sildenafil',  drug2:'nitroglycerin',severity:'high',     description:'Severe hypotension risk — potentially life-threatening drop in blood pressure.', recommendation:'Absolute contraindication.' },
      { drug1:'ciprofloxacin',drug2:'antacids',    severity:'moderate', description:'Antacids reduce ciprofloxacin absorption significantly.', recommendation:'Take ciprofloxacin 2 hours before or 6 hours after antacids.' },
      { drug1:'amoxicillin', drug2:'warfarin',     severity:'moderate', description:'Amoxicillin may enhance anticoagulant effect of warfarin via gut flora alteration.', recommendation:'Monitor INR during antibiotic course.' },
      { drug1:'atorvastatin',drug2:'erythromycin', severity:'moderate', description:'Increased statin plasma levels, elevating myopathy risk.', recommendation:'Temporarily discontinue statin during erythromycin course.' },
      { drug1:'ssri',        drug2:'tramadol',     severity:'high',     description:'Risk of serotonin syndrome — potentially life-threatening.', recommendation:'Avoid combination; use alternative analgesic.' },
      { drug1:'amlodipine',  drug2:'simvastatin',  severity:'moderate', description:'Amlodipine increases simvastatin exposure; dose-dependent myopathy risk.', recommendation:'Limit simvastatin to 20mg/day when combined with amlodipine.' },
      { drug1:'digoxin',     drug2:'amiodarone',   severity:'high',     description:'Amiodarone increases digoxin levels by 70-100%, risk of toxicity.', recommendation:'Reduce digoxin dose by 50% and monitor levels.' },
      { drug1:'lithium',     drug2:'ibuprofen',    severity:'high',     description:'NSAIDs reduce renal lithium clearance, increasing lithium toxicity risk.', recommendation:'Avoid NSAIDs; use paracetamol for pain.' },
    ];

    let added = 0;
    for (const item of COMMON) {
      const [d1, d2] = [item.drug1, item.drug2].sort();
      const exists = await DrugInteraction.findOne({ drug1: d1, drug2: d2 });
      if (!exists) {
        await DrugInteraction.create({ ...item, drug1: d1, drug2: d2 });
        added++;
      }
    }

    return sendSuccess(res, 200, `Seeded ${added} interactions (${COMMON.length - added} already existed)`);
  } catch (err) { next(err); }
});

module.exports = router;
