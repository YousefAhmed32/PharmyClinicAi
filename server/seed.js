/**
 * PharmaClinic — Full Database Seeder
 * Usage:
 *   npm run seed        — safe, skips existing
 *   npm run seed:fresh  — wipe everything then seed
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User            = require('./models/User');
const Product         = require('./models/Product');
const Order           = require('./models/Order');
const Cart            = require('./models/Cart');
const Return          = require('./models/Return');
const Article         = require('./models/Article');
const DrugInteraction = require('./models/DrugInteraction');
const Notification    = require('./models/Notification');
const Appointment     = require('./models/Appointment');

const isFresh = process.argv.includes('--fresh');

// ─────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────
const USERS = [
  // Admin
  { name:'Admin PharmaClinic', email:'admin@pharmyclinic.com',   password:'Admin@123456',  role:'admin',   phone:'01000000001' },
  // Patients
  { name:'Ahmed Hassan',       email:'ahmed@example.com',        password:'Patient@123',   role:'patient', phone:'01112223333', address:{ street:'15 Tahrir St', city:'Cairo',        state:'Cairo',    zip:'11511' } },
  { name:'Sara Mohamed',       email:'sara@example.com',         password:'Patient@123',   role:'patient', phone:'01223334444', address:{ street:'7 Corniche Rd', city:'Alexandria',  state:'Alex',     zip:'21511' } },
  { name:'Khaled Ali',         email:'khaled@example.com',       password:'Patient@123',   role:'patient', phone:'01334445555', address:{ street:'22 Nasr St',   city:'Giza',         state:'Giza',     zip:'12511' } },
  { name:'Fatma Ibrahim',      email:'fatma@example.com',        password:'Patient@123',   role:'patient', phone:'01445556666', address:{ street:'5 Port Said St',city:'Ismailia',    state:'Ismailia', zip:'41511' } },
  { name:'Omar Saad',          email:'omar@example.com',         password:'Patient@123',   role:'patient', phone:'01556667777', address:{ street:'88 Ramses Ave', city:'Cairo',        state:'Cairo',    zip:'11311' } },
  { name:'Nour Adel',          email:'nour@example.com',         password:'Patient@123',   role:'patient', phone:'01667778888', address:{ street:'3 Freedom Sq',  city:'Mansoura',     state:'Dakahlia', zip:'35511' } },
  { name:'Mona Kamal',         email:'mona@example.com',         password:'Patient@123',   role:'patient', phone:'01778889999', address:{ street:'12 Garden City','city':'Cairo',      state:'Cairo',    zip:'11451' } },
  { name:'Youssef Tarek',      email:'youssef@example.com',      password:'Patient@123',   role:'patient', phone:'01889990000', address:{ street:'44 Delta Rd',   city:'Tanta',        state:'Gharbia',  zip:'31511' } },
  { name:'Hana Mostafa',       email:'hana@example.com',         password:'Patient@123',   role:'patient', phone:'01990001111', address:{ street:'6 University St','city':'Assiut',    state:'Assiut',   zip:'71511' } },
  { name:'Karim Nasser',       email:'karim@example.com',        password:'Patient@123',   role:'patient', phone:'01001112222', address:{ street:'19 Sphinx St',  city:'Cairo',        state:'Cairo',    zip:'12611' } },
  // Extra patients
  { name:'Dina Ramadan',       email:'dina@example.com',         password:'Patient@123',   role:'patient', phone:'01011223344' },
  { name:'Walid Fathy',        email:'walid@example.com',        password:'Patient@123',   role:'patient', phone:'01022334455' },
  { name:'Rana Gamal',         email:'rana@example.com',         password:'Patient@123',   role:'patient', phone:'01033445566' },
  { name:'Sami Hamdy',         email:'sami@example.com',         password:'Patient@123',   role:'patient', phone:'01044556677' },
  { name:'Noha Sherif',        email:'noha@example.com',         password:'Patient@123',   role:'patient', phone:'01055667788' },
  { name:'Amr Zaki',           email:'amr@example.com',          password:'Patient@123',   role:'patient', phone:'01066778899' },
  { name:'Eman Lotfy',         email:'eman@example.com',         password:'Patient@123',   role:'patient', phone:'01077889900' },
  { name:'Hassan Badr',        email:'hassan@example.com',       password:'Patient@123',   role:'patient', phone:'01088990011' },
  { name:'Layla Mahmoud',      email:'layla@example.com',        password:'Patient@123',   role:'patient', phone:'01099001122' },
];

// ─────────────────────────────────────────────────────────────────────────
// PRODUCTS  (50 products)
// ─────────────────────────────────────────────────────────────────────────
const RAW_PRODUCTS = [
  // ── Vitamins ──────────────────────────────────────────────────────────
  { name:'Vitamin C 1000mg', description:'High-potency vitamin C for immune support and antioxidant protection. Promotes collagen formation and iron absorption.', price:89,  comparePrice:120, stock:150, category:'vitamins', genericName:'Ascorbic Acid',         barcode:'6224000000001', isFeatured:true,  tags:['immunity','antioxidant'],   unit:'strip', unitLabel:'شريط' },
  { name:'Vitamin D3 5000 IU', description:'Essential vitamin D3 for bone health, calcium absorption and immune function. Ideal for those with limited sun exposure.', price:120, comparePrice:160, stock:200, category:'vitamins', genericName:'Cholecalciferol',        barcode:'6224000000002', isFeatured:true,  tags:['bone-health','immunity'],   unit:'box',   unitLabel:'علبة' },
  { name:'Vitamin B Complex', description:'Complete B-vitamin formula supporting energy metabolism, nervous system health and red blood cell production.', price:75,  stock:180, category:'vitamins', barcode:'6224000000003', isFeatured:false, tags:['energy','nervous-system'],  unit:'box',   unitLabel:'علبة' },
  { name:'Vitamin E 400 IU', description:'Natural-source vitamin E for antioxidant protection, skin health and cardiovascular support.', price:65,  stock:120, category:'vitamins', genericName:'Tocopherol',             barcode:'6224000000004', tags:['antioxidant','skin'],       unit:'box',   unitLabel:'علبة' },
  { name:'Vitamin A 10000 IU', description:'Essential fat-soluble vitamin supporting vision, immune function and skin health.', price:55,  stock:130, category:'vitamins', genericName:'Retinol',                barcode:'6224000000005', tags:['vision','immunity'],        unit:'box',   unitLabel:'علبة' },
  { name:'Vitamin K2 MK7', description:'Vitamin K2 in the most bioavailable MK-7 form. Directs calcium to bones and away from arteries.', price:145, stock:90,  category:'vitamins', genericName:'Menaquinone-7',          barcode:'6224000000006', tags:['bone','cardiovascular'],   unit:'box',   unitLabel:'علبة' },
  { name:'Multivitamin Complete', description:'Comprehensive daily multivitamin with 23 vitamins and minerals for overall health and wellbeing.', price:165, comparePrice:220, stock:200, category:'vitamins', isFeatured:true, barcode:'6224000000007', tags:['daily','complete'],         unit:'box',   unitLabel:'علبة' },

  // ── Supplements ───────────────────────────────────────────────────────
  { name:'Omega-3 Fish Oil 1000mg', description:'Pharmaceutical-grade omega-3 (EPA 180mg / DHA 120mg). Supports heart health, brain function and reduces inflammation.', price:145, comparePrice:200, stock:300, category:'supplements', genericName:'Omega-3 Fatty Acids', barcode:'6224000000010', isFeatured:true, tags:['heart','brain','omega3'],   unit:'box',   unitLabel:'علبة' },
  { name:'Magnesium Glycinate 400mg', description:'Highly bioavailable magnesium supporting muscle relaxation, quality sleep and stress management.', price:110, stock:180, category:'supplements', genericName:'Magnesium',              barcode:'6224000000011', tags:['sleep','muscle','stress'],  unit:'box',   unitLabel:'علبة' },
  { name:'Zinc Picolinate 50mg', description:'Most absorbable zinc form for immune function, wound healing, and maintaining taste and smell.', price:80,  stock:220, category:'supplements', genericName:'Zinc',                   barcode:'6224000000012', tags:['immunity','zinc'],          unit:'box',   unitLabel:'علبة' },
  { name:'Probiotics 50 Billion CFU', description:'Multi-strain probiotic with 10 clinically selected strains. Supports digestive health and immune function.', price:195, comparePrice:250, stock:90, category:'supplements', isFeatured:true, barcode:'6224000000013', tags:['gut-health','probiotics'],  unit:'box',   unitLabel:'علبة' },
  { name:'Collagen Peptides Powder', description:'Hydrolyzed marine collagen 10g per serving. Supports skin elasticity, joint health, hair and nail growth.', price:230, stock:60,  category:'supplements', barcode:'6224000000014', tags:['skin','joints','collagen'], unit:'pack',  unitLabel:'عبوة' },
  { name:'Iron Bisglycinate 25mg', description:'Gentle non-constipating iron supplement. High absorption for iron-deficiency anaemia support.', price:70,  stock:160, category:'supplements', genericName:'Ferrous Bisglycinate',   barcode:'6224000000015', tags:['iron','anemia'],            unit:'box',   unitLabel:'علبة' },
  { name:'Coenzyme Q10 200mg', description:'Powerful antioxidant supporting cellular energy production and cardiovascular health.', price:185, comparePrice:240, stock:75, category:'supplements', genericName:'Ubiquinone', barcode:'6224000000016', tags:['energy','heart','antioxidant'], unit:'box', unitLabel:'علبة' },
  { name:'Biotin 10000mcg', description:'High-potency biotin supporting healthy hair, strong nails and smooth skin.', price:95,  stock:140, category:'supplements', genericName:'Vitamin B7',             barcode:'6224000000017', tags:['hair','nails','skin'],      unit:'box',   unitLabel:'علبة' },
  { name:'Turmeric Curcumin 500mg', description:'Standardized curcumin extract with black pepper for enhanced absorption. Anti-inflammatory and antioxidant.', price:130, stock:110, category:'supplements', barcode:'6224000000018', tags:['anti-inflammatory','joints'], unit:'box', unitLabel:'علبة' },
  { name:'Ashwagandha 600mg KSM-66', description:'Clinically studied adaptogen KSM-66 extract for stress relief, energy and hormonal balance.', price:155, stock:85,  category:'supplements', barcode:'6224000000019', tags:['stress','energy','adaptogen'], unit:'box', unitLabel:'علبة' },

  // ── Medicines ─────────────────────────────────────────────────────────
  { name:'Paracetamol 500mg', description:'Effective pain relief and fever reducer. Safe for adults and children over 12 years when used as directed.', price:15,  stock:500, category:'medicines', genericName:'Paracetamol',            barcode:'6224000000020', isFeatured:true, tags:['pain-relief','fever'],
    hasVariants:true, variants:[
      { unit:'strip', label:'شريط (10 حبات)', price:15,  stock:300, isDefault:true, itemsPerUnit:10, barcode:'6224000000020A' },
      { unit:'box',   label:'علبة (30 حبة)',   price:40,  stock:150, isDefault:false,itemsPerUnit:30, barcode:'6224000000020B' },
      { unit:'box',   label:'علبة كبيرة (100 حبة)', price:120, stock:50, isDefault:false,itemsPerUnit:100,barcode:'6224000000020C' },
    ]
  },
  { name:'Ibuprofen 400mg', description:'Anti-inflammatory pain relief for headache, toothache, muscular pain, period pain and fever.', price:12,  stock:400, category:'medicines', genericName:'Ibuprofen',              barcode:'6224000000021', tags:['anti-inflammatory','pain'],
    hasVariants:true, variants:[
      { unit:'strip', label:'شريط (8 حبات)',  price:12,  stock:250, isDefault:true,  itemsPerUnit:8,  barcode:'6224000000021A' },
      { unit:'box',   label:'علبة (24 حبة)',  price:32,  stock:150, isDefault:false, itemsPerUnit:24, barcode:'6224000000021B' },
    ]
  },
  { name:'Amoxicillin 500mg', description:'Broad-spectrum antibiotic for bacterial infections. Must be prescribed by a physician.', price:18,  stock:200, category:'medicines', genericName:'Amoxicillin',            barcode:'6224000000022', tags:['antibiotic'],               unit:'strip', unitLabel:'شريط' },
  { name:'Omeprazole 20mg', description:'Proton pump inhibitor for acid reflux, GERD and stomach ulcer treatment. 14-day course.', price:22,  stock:180, category:'medicines', genericName:'Omeprazole',             barcode:'6224000000023', tags:['acid-reflux','stomach'],    unit:'strip', unitLabel:'شريط' },
  { name:'Metformin 500mg', description:'First-line medication for type 2 diabetes management. Helps control blood sugar levels.', price:8,   stock:300, category:'medicines', genericName:'Metformin',              barcode:'6224000000024', tags:['diabetes','blood-sugar'],   unit:'strip', unitLabel:'شريط' },
  { name:'Cetirizine 10mg', description:'Non-drowsy antihistamine for allergy relief, hay fever, hives and allergic rhinitis.', price:10,  stock:0,   category:'medicines', genericName:'Cetirizine',             barcode:'6224000000025', tags:['allergy','antihistamine'],  unit:'strip', unitLabel:'شريط' },
  { name:'Antacid Suspension 200ml', description:'Fast-acting mint-flavoured antacid for heartburn, acid indigestion and stomach discomfort.', price:45,  stock:8,   category:'medicines', genericName:'Aluminium Hydroxide',    barcode:'6224000000026', tags:['antacid','heartburn'],     unit:'bottle', unitLabel:'زجاجة' },
  { name:'Cough Syrup 100ml', description:'Soothing cough syrup with honey and menthol. Relieves dry and productive cough. Sugar-free.', price:35,  stock:120, category:'medicines', barcode:'6224000000027', tags:['cough','respiratory'],       unit:'bottle', unitLabel:'زجاجة' },
  { name:'Nasal Decongestant Spray', description:'Fast-acting nasal spray for blocked nose. Provides up to 12-hour relief from nasal congestion.', price:55,  stock:90,  category:'medicines', barcode:'6224000000028', tags:['nasal','congestion'],        unit:'bottle', unitLabel:'زجاجة' },
  { name:'Eye Drops Lubricating', description:'Preservative-free artificial tears for dry eyes. Provides lasting relief and comfort.', price:42,  stock:100, category:'medicines', barcode:'6224000000029', tags:['eye','dry-eye'],             unit:'bottle', unitLabel:'زجاجة' },
  { name:'Diclofenac Gel 50g', description:'Topical anti-inflammatory gel for muscle and joint pain, sports injuries and arthritis.', price:38,  stock:140, category:'medicines', genericName:'Diclofenac Sodium',      barcode:'6224000000030', tags:['topical','pain','joints'],  unit:'tube',  unitLabel:'أنبوب' },

  // ── Skincare ──────────────────────────────────────────────────────────
  { name:'SPF 50+ Sunscreen 75ml', description:'Broad-spectrum UVA/UVB protection. Water-resistant formula. Dermatologist tested, non-comedogenic.', price:185, comparePrice:220, stock:130, category:'skincare', isFeatured:true, barcode:'6224000000031', tags:['sunscreen','spf'],          unit:'tube',  unitLabel:'أنبوب' },
  { name:'Hyaluronic Acid Serum 30ml', description:'2% hyaluronic acid intense hydration serum. Reduces fine lines and plumps skin for 24 hours.', price:275, stock:75,  category:'skincare', isFeatured:false, barcode:'6224000000032', tags:['hydration','anti-aging'],   unit:'bottle', unitLabel:'زجاجة' },
  { name:'Moisturising Cream 100ml', description:'Rich ceramide and niacinamide cream restoring skin barrier and providing lasting 24-hour hydration.', price:145, stock:95,  category:'skincare', barcode:'6224000000033', tags:['moisturiser','dry-skin'],   unit:'tube',  unitLabel:'أنبوب' },
  { name:'Retinol Night Cream 50ml', description:'0.3% retinol anti-aging night cream. Reduces wrinkles and improves skin texture overnight.', price:320, comparePrice:400, stock:45, category:'skincare', isFeatured:true, barcode:'6224000000034', tags:['anti-aging','retinol'],     unit:'tube',  unitLabel:'أنبوب' },
  { name:'Niacinamide 10% Serum', description:'10% niacinamide with zinc for pore minimising, brightening and oil control.', price:195, stock:65,  category:'skincare', barcode:'6224000000035', tags:['brightening','pores'],      unit:'bottle', unitLabel:'زجاجة' },
  { name:'Glycolic Acid Toner', description:'7% glycolic acid exfoliating toner. Removes dead skin cells and improves skin texture.', price:165, stock:55,  category:'skincare', barcode:'6224000000036', tags:['exfoliating','glow'],       unit:'bottle', unitLabel:'زجاجة' },

  // ── Equipment ─────────────────────────────────────────────────────────
  { name:'Digital Blood Pressure Monitor', description:'Clinically validated upper-arm BP monitor. Large LCD display, irregular heartbeat detection, 60-reading memory.', price:850, comparePrice:1200, stock:25, category:'equipment', isFeatured:true, barcode:'6224000000040', tags:['blood-pressure','monitor'], unit:'piece', unitLabel:'جهاز' },
  { name:'Digital Thermometer', description:'10-second reading flexible-tip thermometer. Fever alert, waterproof, for all ages.', price:95,  stock:6,   category:'equipment', barcode:'6224000000041', tags:['thermometer','fever'],      unit:'piece', unitLabel:'جهاز' },
  { name:'Pulse Oximeter', description:'Fingertip SpO2 and pulse rate monitor with OLED display. Battery saving auto power-off.', price:350, stock:40,  category:'equipment', barcode:'6224000000042', tags:['oxygen','spo2'],            unit:'piece', unitLabel:'جهاز' },
  { name:'Glucometer Complete Kit', description:'Blood glucose monitoring kit with 25 test strips, 25 lancets, lancing device and carry pouch.', price:495, comparePrice:650, stock:30, category:'equipment', isFeatured:false, barcode:'6224000000043', tags:['diabetes','glucose'],       unit:'piece', unitLabel:'جهاز' },
  { name:'Nebuliser Machine', description:'Compressor nebuliser for asthma and respiratory medication delivery. Quiet operation, suitable for all ages.', price:650, comparePrice:900, stock:15, category:'equipment', barcode:'6224000000044', tags:['asthma','respiratory'],     unit:'piece', unitLabel:'جهاز' },
  { name:'Heating Pad Electric', description:'Auto shut-off moist/dry heating pad with 3 heat settings. For muscle pain and cramps.', price:220, stock:35,  category:'equipment', barcode:'6224000000045', tags:['pain-relief','muscle'],     unit:'piece', unitLabel:'جهاز' },

  // ── Baby Care ─────────────────────────────────────────────────────────
  { name:'Baby Vitamin D Drops', description:'400 IU vitamin D3 drops for newborns and infants. Supports healthy bone development.', price:85,  stock:120, category:'babycare', barcode:'6224000000050', tags:['baby','vitamin-d'],         unit:'bottle', unitLabel:'زجاجة' },
  { name:'Baby Teething Gel 15g', description:'Soothing gum gel for teething infants. Lidocaine-free, sugar-free, fruit flavoured.', price:55,  stock:90,  category:'babycare', barcode:'6224000000051', tags:['baby','teething'],          unit:'tube',  unitLabel:'أنبوب' },
  { name:'Gripe Water 150ml', description:'Traditional herbal remedy for infant colic, wind and digestive discomfort. Alcohol and sugar free.', price:65,  stock:100, category:'babycare', barcode:'6224000000052', tags:['baby','colic'],             unit:'bottle', unitLabel:'زجاجة' },
  { name:'Baby Nappy Rash Cream', description:'Zinc oxide barrier cream for nappy rash prevention and treatment. Gentle on sensitive skin.', price:48,  stock:130, category:'babycare', barcode:'6224000000053', tags:['baby','nappy-rash'],        unit:'tube',  unitLabel:'أنبوب' },

  // ── Personal Care ─────────────────────────────────────────────────────
  { name:'Surgical Masks (50 pack)', description:'3-ply disposable face masks. High filtration efficiency with comfortable ear loops.', price:75,  comparePrice:100, stock:300, category:'personal-care', barcode:'6224000000060', isFeatured:false, tags:['masks','protection'],      unit:'pack',  unitLabel:'عبوة' },
  { name:'Hand Sanitiser 500ml', description:'70% alcohol-based hand sanitiser. Kills 99.9% of germs. Moisturising formula with aloe vera.', price:45,  stock:200, category:'personal-care', barcode:'6224000000061', tags:['sanitiser','hygiene'],      unit:'bottle', unitLabel:'زجاجة' },
  { name:'Elastic Bandage Roll', description:'3m self-adhesive elastic bandage for sprains and strains. Latex-free, breathable.', price:18,  stock:180, category:'personal-care', barcode:'6224000000062', tags:['bandage','first-aid'],      unit:'piece', unitLabel:'قطعة' },
  { name:'First Aid Kit Complete', description:'Comprehensive 50-piece first aid kit for home and travel. Includes plasters, bandages and antiseptic wipes.', price:185, comparePrice:250, stock:40, category:'personal-care', isFeatured:true, barcode:'6224000000063', tags:['first-aid','emergency'],   unit:'piece', unitLabel:'مجموعة' },
];

// ─────────────────────────────────────────────────────────────────────────
// DRUG INTERACTIONS (20)
// ─────────────────────────────────────────────────────────────────────────
const INTERACTIONS = [
  { drug1:'warfarin',      drug2:'ibuprofen',    severity:'high',     description:'NSAIDs increase bleeding risk when combined with anticoagulants.',   recommendation:'Avoid combination; use paracetamol instead.' },
  { drug1:'metformin',     drug2:'alcohol',      severity:'moderate', description:'Alcohol increases risk of lactic acidosis with metformin.',          recommendation:'Avoid alcohol while taking metformin.' },
  { drug1:'amoxicillin',   drug2:'warfarin',     severity:'moderate', description:'Antibiotics may enhance anticoagulant effect of warfarin.',          recommendation:'Monitor INR closely.' },
  { drug1:'cetirizine',    drug2:'alcohol',      severity:'moderate', description:'Combined CNS depression can cause excessive sedation.',               recommendation:'Avoid alcohol with antihistamines.' },
  { drug1:'omeprazole',    drug2:'clopidogrel',  severity:'high',     description:'Omeprazole reduces antiplatelet effect of clopidogrel significantly.',recommendation:'Consider alternative PPI like pantoprazole.' },
  { drug1:'ibuprofen',     drug2:'aspirin',      severity:'moderate', description:'Concurrent use reduces cardioprotective effects of aspirin.',         recommendation:'Separate doses by at least 2 hours.' },
  { drug1:'metformin',     drug2:'ibuprofen',    severity:'moderate', description:'NSAIDs can reduce kidney function impairing metformin excretion.',    recommendation:'Monitor renal function.' },
  { drug1:'diclofenac',    drug2:'warfarin',     severity:'high',     description:'Diclofenac displaces warfarin from binding sites, increasing effect.',recommendation:'Avoid combination or monitor INR carefully.' },
  { drug1:'paracetamol',   drug2:'warfarin',     severity:'low',      description:'High doses of paracetamol may slightly enhance warfarin effect.',     recommendation:'Keep paracetamol dose below 2g/day.' },
  { drug1:'omeprazole',    drug2:'methotrexate', severity:'moderate', description:'PPIs may increase methotrexate levels causing toxicity.',              recommendation:'Monitor for methotrexate toxicity.' },
  { drug1:'cetirizine',    drug2:'lorazepam',    severity:'high',     description:'Combined sedative effect can cause respiratory depression.',            recommendation:'Avoid combination.' },
  { drug1:'ibuprofen',     drug2:'methotrexate', severity:'high',     description:'NSAIDs reduce methotrexate clearance causing toxicity.',               recommendation:'Avoid combination.' },
  { drug1:'amoxicillin',   drug2:'methotrexate', severity:'moderate', description:'Antibiotics may reduce methotrexate renal elimination.',               recommendation:'Monitor closely for toxicity.' },
  { drug1:'aspirin',       drug2:'warfarin',     severity:'high',     description:'Additive anticoagulant and antiplatelet effects increase bleeding.',   recommendation:'Only combine under close medical supervision.' },
  { drug1:'diclofenac',    drug2:'lithium',      severity:'high',     description:'NSAIDs reduce renal lithium clearance causing toxicity.',               recommendation:'Monitor lithium levels closely.' },
  { drug1:'metformin',     drug2:'contrast dye', severity:'high',     description:'Contrast agents can impair renal function causing metformin accumulation.',recommendation:'Hold metformin 48h before and after contrast.' },
  { drug1:'omeprazole',    drug2:'iron',         severity:'moderate', description:'PPIs reduce gastric acid needed for iron absorption.',                  recommendation:'Take iron 2 hours before PPI.' },
  { drug1:'paracetamol',   drug2:'alcohol',      severity:'high',     description:'Chronic alcohol use increases risk of paracetamol-induced liver damage.',recommendation:'Avoid regular paracetamol use with chronic alcohol.' },
  { drug1:'ibuprofen',     drug2:'lithium',      severity:'moderate', description:'NSAIDs reduce lithium clearance increasing plasma levels.',             recommendation:'Monitor lithium levels.' },
  { drug1:'cetirizine',    drug2:'cimetidine',   severity:'low',      description:'Cimetidine slightly increases cetirizine plasma levels.',               recommendation:'No action usually required.' },
];

// ─────────────────────────────────────────────────────────────────────────
// ARTICLES (10)
// ─────────────────────────────────────────────────────────────────────────
const ARTICLES = [
  { title:'The Complete Guide to Vitamin D Deficiency', summary:'Learn why vitamin D deficiency is widespread, how to identify it and the best supplementation strategies.', content:'Vitamin D deficiency affects over 1 billion people worldwide. This comprehensive guide covers causes, symptoms and optimal supplementation dosing for different age groups...', category:'vitamins', readTime:6, isFeatured:true },
  { title:'Understanding Omega-3 Fatty Acids', summary:'A deep dive into EPA, DHA and ALA — benefits, sources, and how to choose the right supplement.', content:'Omega-3 fatty acids are essential polyunsaturated fats that play crucial roles in brain function, heart health and reducing chronic inflammation...', category:'supplements', readTime:5, isFeatured:true },
  { title:'10 Common Drug Interactions to Know', summary:'Protect yourself by understanding these dangerous drug combinations that many people unknowingly take together.', content:'Drug interactions can range from minor inconveniences to life-threatening emergencies. Here are 10 interactions every patient should be aware of...', category:'safety', readTime:8, isFeatured:true },
  { title:'Blood Pressure Monitoring at Home', summary:'How to correctly measure your blood pressure at home, understand the readings and when to seek medical help.', content:'Home blood pressure monitoring is an effective way to track cardiovascular health between doctor visits. To get accurate readings follow these steps...', category:'health-tips', readTime:5, isFeatured:false },
  { title:'Probiotics: Separating Fact from Fiction', summary:'The science behind probiotics — what strains actually work and what conditions benefit from probiotic supplementation.', content:'The probiotic market is worth billions, but not all products are equal. Understanding CFU counts, strain specificity and survivability is key...', category:'supplements', readTime:7, isFeatured:false },
  { title:'Managing Type 2 Diabetes with Lifestyle', summary:'Evidence-based lifestyle strategies that complement medication for better blood sugar control and quality of life.', content:'Type 2 diabetes management extends far beyond medication. Diet, exercise, stress management and sleep quality all profoundly affect glycaemic control...', category:'chronic-disease', readTime:9, isFeatured:false },
  { title:'Skincare Actives: A Pharmacist Guide', summary:'Retinol, niacinamide, hyaluronic acid — understanding what each active ingredient does and how to layer them safely.', content:'The skincare market is flooded with active ingredients. As pharmacists we often get asked about compatibility and correct application order...', category:'skincare', readTime:6, isFeatured:false },
  { title:'Children Fever: When to Treat and When to Worry', summary:'Practical guidance for parents on managing childhood fever safely and recognising warning signs.', content:'Fever in children is one of the most common reasons parents visit pharmacies. Understanding normal body temperature ranges and safe management strategies...', category:'paediatrics', readTime:5, isFeatured:false },
  { title:'Safe Storage of Medicines at Home', summary:'Many medications lose efficacy or become dangerous when stored incorrectly. Follow these pharmacist tips for safe storage.', content:'Incorrect medicine storage is a widespread problem. Heat, humidity and light all degrade medications faster than most people realise...', category:'safety', readTime:4, isFeatured:false },
  { title:'The Role of Magnesium in Modern Health', summary:'Magnesium deficiency is remarkably common. Discover how this mineral affects sleep, stress, heart health and more.', content:'Magnesium is involved in over 300 enzymatic reactions in the body, yet an estimated 50% of adults do not get adequate amounts from diet alone...', category:'supplements', readTime:6, isFeatured:false },
];

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randItem(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function generateOrderNumber(seq) {
  return `ORD-${String(seq).padStart(6, '0')}`;
}

function generateReturnNumber(seq) {
  return `RET-${String(seq).padStart(6, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmyclinic';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    if (isFresh) {
      console.log('🗑  Clearing all collections...');
      await Promise.all([
        User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}),
        Cart.deleteMany({}), Return.deleteMany({}), Article.deleteMany({}),
        DrugInteraction.deleteMany({}), Notification.deleteMany({}),
        Appointment.deleteMany({}),
      ]);
      console.log('✅ All collections cleared');
    }

    // ── USERS ──────────────────────────────────────────────────────────
    console.log('\n👤 Seeding users...');
    const createdUsers = [];
    for (const u of USERS) {
      const exists = await User.findOne({ email: u.email });
      if (exists) { createdUsers.push(exists); continue; }
      const user = await User.create(u);
      createdUsers.push(user);
      process.stdout.write('.');
    }
    console.log(`\n✅ ${createdUsers.length} users`);

    const admin    = createdUsers.find(u => u.role === 'admin');
    const patients = createdUsers.filter(u => u.role === 'patient');

    // ── PRODUCTS ───────────────────────────────────────────────────────
    console.log('\n💊 Seeding products...');
    const createdProducts = [];
    for (const raw of RAW_PRODUCTS) {
      const exists = await Product.findOne({ name: raw.name });
      if (exists) { createdProducts.push(exists); continue; }

      const productData = { ...raw, createdBy: admin._id };

      // If hasVariants, compute aggregate price/stock
      if (productData.hasVariants && productData.variants?.length > 0) {
        const def = productData.variants.find(v => v.isDefault) || productData.variants[0];
        productData.price = def.price;
        productData.stock = productData.variants.reduce((s, v) => s + v.stock, 0);
      }

      const product = await Product.create(productData);
      createdProducts.push(product);
      process.stdout.write('.');
    }
    console.log(`\n✅ ${createdProducts.length} products`);

    // ── DRUG INTERACTIONS ─────────────────────────────────────────────
    console.log('\n⚗️  Seeding drug interactions...');
    let intCount = 0;
    for (const inter of INTERACTIONS) {
      const [d1, d2] = [inter.drug1, inter.drug2].sort();
      const exists   = await DrugInteraction.findOne({ drug1: d1, drug2: d2 });
      if (!exists) {
        await DrugInteraction.create({ ...inter, drug1: d1, drug2: d2, createdBy: admin._id });
        intCount++;
      }
    }
    console.log(`✅ ${intCount} new interactions`);

    // ── ARTICLES ───────────────────────────────────────────────────────
    console.log('\n📰 Seeding articles...');
    let artCount = 0;
    for (const art of ARTICLES) {
      const slug   = slugify(art.title);
      const exists = await Article.findOne({ slug });
      if (!exists) {
        await Article.create({ ...art, slug, author: admin._id, status: 'published', publishedAt: daysAgo(randInt(1, 60)) });
        artCount++;
      }
    }
    console.log(`✅ ${artCount} new articles`);

    // ── ORDERS (35 orders) ─────────────────────────────────────────────
    console.log('\n📦 Seeding orders...');
    const orderCount   = await Order.countDocuments();
    const ordersToMake = Math.max(0, 35 - orderCount);

    const ORDER_STATUSES = [
      'delivered','delivered','delivered','delivered',
      'out_for_delivery','out_for_delivery',
      'processing','processing',
      'confirmed','confirmed',
      'reviewing','pending',
      'cancelled','rejected','returned','refunded',
    ];

    let orderSeq = orderCount + 1;
    for (let i = 0; i < ordersToMake; i++) {
      const patient = randItem(patients);
      const addr    = patient.address || {};

      // Pick 1–4 random products
      const numItems = randInt(1, 4);
      const shuffled = [...createdProducts].sort(() => Math.random() - 0.5).slice(0, numItems);

      const items = shuffled.map(p => ({
        product:   p._id,
        name:      p.name,
        image:     p.image || null,
        price:     p.effectivePrice || p.price,
        quantity:  randInt(1, 3),
        unit:      p.unit      || 'piece',
        unitLabel: p.unitLabel || 'قطعة',
      }));

      const subtotal    = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
      const shippingCost = subtotal >= 500 ? 0 : 30;
      const total       = parseFloat((subtotal + shippingCost).toFixed(2));
      const status      = randItem(ORDER_STATUSES);
      const createdAt   = daysAgo(randInt(0, 90));

      const statusHistory = [
        { status:'pending', note:'تم إنشاء الطلب', changedBy: admin._id, changedAt: createdAt },
      ];

      if (!['pending'].includes(status)) {
        statusHistory.push({ status:'confirmed', note:'تم التأكيد', changedBy: admin._id, changedAt: new Date(createdAt.getTime() + 3600000) });
      }
      if (['processing','out_for_delivery','delivered','returned','refunded'].includes(status)) {
        statusHistory.push({ status:'processing', note:'جاري التجهيز', changedBy: admin._id, changedAt: new Date(createdAt.getTime() + 7200000) });
      }
      if (['out_for_delivery','delivered','returned','refunded'].includes(status)) {
        statusHistory.push({ status:'out_for_delivery', note:'في الطريق', changedBy: admin._id, changedAt: new Date(createdAt.getTime() + 86400000) });
      }
      if (['delivered','returned','refunded'].includes(status)) {
        statusHistory.push({ status:'delivered', note:'تم التوصيل', changedBy: admin._id, changedAt: new Date(createdAt.getTime() + 172800000) });
      }

      await Order.create({
        orderNumber:   generateOrderNumber(orderSeq++),
        user:          patient._id,
        items,
        shippingAddress: {
          fullName: patient.name,
          phone:    patient.phone || '01000000000',
          street:   addr.street  || '1 Main Street',
          city:     addr.city    || 'Cairo',
          state:    addr.state   || 'Cairo',
          zip:      addr.zip     || '11511',
          country:  'Egypt',
        },
        paymentMethod:  randItem(['cash_on_delivery','credit_card','wallet']),
        paymentStatus:  status === 'delivered' ? randItem(['paid','pending']) : 'pending',
        status,
        subtotal,
        shippingCost,
        total,
        statusHistory,
        createdAt,
        deliveredAt:   status === 'delivered' ? new Date(createdAt.getTime() + 172800000) : null,
        confirmedAt:   !['pending','reviewing'].includes(status) ? new Date(createdAt.getTime() + 3600000) : null,
      });
      process.stdout.write('.');
    }
    console.log(`\n✅ ${ordersToMake} new orders (total: ${orderSeq - 1})`);

    // ── RETURNS (5 returns for delivered orders) ───────────────────────
    console.log('\n↩️  Seeding returns...');
    const returnCount   = await Return.countDocuments();
    if (returnCount < 5) {
      const deliveredOrders = await Order.find({ status:'delivered' }).limit(8).lean();
      const RETURN_REASONS  = ['wrong_product','damaged','expired','not_as_described','changed_mind'];
      const RETURN_STATUSES = ['pending','approved','received','refunded','rejected'];
      let retSeq = returnCount + 1;

      for (let i = 0; i < Math.min(5, deliveredOrders.length); i++) {
        const order  = deliveredOrders[i];
        const item   = order.items[0];
        const status = RETURN_STATUSES[i % RETURN_STATUSES.length];

        const returnItems = [{
          product:     item.product,
          name:        item.name,
          image:       item.image || null,
          price:       item.price,
          quantity:    item.quantity,
          returnedQty: Math.min(1, item.quantity),
          unit:        item.unit      || 'piece',
          unitLabel:   item.unitLabel || 'قطعة',
        }];

        await Return.create({
          returnNumber: generateReturnNumber(retSeq++),
          order:        order._id,
          patient:      order.user,
          items:        returnItems,
          reason:       RETURN_REASONS[i % RETURN_REASONS.length],
          reasonDetails:'اتصل العميل للاستفسار',
          status,
          refundAmount: parseFloat((item.price * 1).toFixed(2)),
          stockRestored: ['received','refunded'].includes(status),
          approvedAt:   ['approved','received','refunded'].includes(status) ? new Date() : null,
          receivedAt:   ['received','refunded'].includes(status) ? new Date() : null,
          refundedAt:   status === 'refunded' ? new Date() : null,
        });
        process.stdout.write('.');
      }
      console.log(`\n✅ ${retSeq - returnCount - 1} new returns`);
    } else {
      console.log('✅ Returns already seeded');
    }

    // ── APPOINTMENTS (10) ─────────────────────────────────────────────
    console.log('\n📅 Seeding appointments...');
    const apptCount = await Appointment.countDocuments();
    if (apptCount < 10) {
      const DOCTORS   = ['Dr. Ahmed Sayed','Dr. Sara Hassan','Dr. Khaled Nour'];
      const APT_STATS = ['pending','confirmed','completed','cancelled'];
      for (let i = 0; i < 10; i++) {
        const patient  = randItem(patients);
        const apptDate = daysAgo(randInt(-7, 30)); // mix of past and future
        await Appointment.create({
          patient:    patient._id,
          doctor:     randItem(DOCTORS),
          date:       apptDate,
          time:       `${randInt(9,17)}:00`,
          type:       randItem(['consultation','follow-up','prescription']),
          status:     APT_STATS[i % APT_STATS.length],
          notes:      i % 3 === 0 ? 'يرجى إحضار نتائج التحاليل' : null,
        });
        process.stdout.write('.');
      }
      console.log('\n✅ 10 appointments');
    } else {
      console.log('✅ Appointments already seeded');
    }

    // ── SUMMARY ────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SEED COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const [uC,pC,oC,rC,iC,aC] = await Promise.all([
      User.countDocuments(),    Product.countDocuments(),
      Order.countDocuments(),   Return.countDocuments(),
      DrugInteraction.countDocuments(), Article.countDocuments(),
    ]);
    console.log(`  👥 Users:       ${uC}  (1 admin + ${uC-1} patients)`);
    console.log(`  💊 Products:    ${pC}`);
    console.log(`  📦 Orders:      ${oC}`);
    console.log(`  ↩️  Returns:     ${rC}`);
    console.log(`  ⚗️  Interactions:${iC}`);
    console.log(`  📰 Articles:    ${aC}`);
    console.log('\n  🔑 Admin Login:');
    console.log('     Email:    admin@pharmyclinic.com');
    console.log('     Password: Admin@123456');
    console.log('\n  👤 Patient Login:');
    console.log('     Email:    ahmed@example.com');
    console.log('     Password: Patient@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB connection closed');
    process.exit(0);
  }
}

seed();
