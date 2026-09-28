const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');
const { readDb, writeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_BASE = path.join(__dirname, '..', 'uploads');
const UPLOAD_LOANS = path.join(UPLOAD_BASE, 'loans');
const UPLOAD_RECEIPTS = path.join(UPLOAD_BASE, 'receipts');
const UPLOAD_ITEMS = path.join(UPLOAD_BASE, 'items');

[UPLOAD_BASE, UPLOAD_LOANS, UPLOAD_RECEIPTS, UPLOAD_ITEMS].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const loanStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_LOANS),
  filename: (req, file, cb) => {
    const uniqueId = req.body.uniqueId || 'REQ';
    const cleanId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'signedDocument' ? 'SURAT' : 'KTM';
    cb(null, `${prefix}_${cleanId}_${Date.now()}${ext}`);
  }
});

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_RECEIPTS),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `NOTA_${Date.now()}${ext}`);
  }
});

const itemStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ITEMS),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ITEM_${Date.now()}_${Math.floor(Math.random()*1000)}${ext}`);
  }
});

const uploadLoan = multer({
  storage: loanStorage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadItem = multer({
  storage: itemStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOAD_BASE));
app.use(express.static(path.join(__dirname, '..', 'public')));

function requireAdmin(req, res, next) {
  const token = req.headers['authorization'];
  if (token && token.startsWith('Bearer iot-admin-token-')) {
    return next();
  }
  return res.status(401).json({ error: "Akses ditolak. Khusus pengelola Lab IoT." });
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  if (username === db.admin.username && password === db.admin.password) {
    const token = `iot-admin-token-${Date.now()}`;
    return res.json({
      success: true,
      token,
      user: {
        username: db.admin.username,
        name: db.admin.name,
        role: db.admin.role
      }
    });
  }
  return res.status(401).json({ error: "Username atau password salah!" });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers['authorization'];
  if (token && token.startsWith('Bearer iot-admin-token-')) {
    const db = readDb();
    return res.json({
      authenticated: true,
      user: {
        username: db.admin.username,
        name: db.admin.name,
        role: db.admin.role
      }
    });
  }
  return res.json({ authenticated: false });
});

app.get('/api/inventory', (req, res) => {
  const db = readDb();
  res.json(db.inventory);
});

app.post('/api/inventory', requireAdmin, uploadItem.single('image'), (req, res) => {
  const { name, category, location, totalStock, unit, condition, loanable, description, imageUrl } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "Nama dan kategori barang wajib diisi." });
  }

  const db = readDb();
  const stockNum = parseInt(totalStock) || 1;
  const newId = `INV-${String(db.inventory.length + 1).padStart(3, '0')}`;

  let loanPolicyText = "Boleh Dipinjam (Umum & Internal)";
  if (loanable === 'internal_only') loanPolicyText = "Khusus Internal Lab IoT";
  if (loanable === 'restricted') loanPolicyText = "Aset Tetap Lab (Hanya Digunakan di Ruang Lab)";

  let finalImageUrl = "/assets/logo-iot-lab.png";
  if (req.file) {
    finalImageUrl = `/uploads/items/${req.file.filename}`;
  } else if (imageUrl && imageUrl.trim()) {
    finalImageUrl = imageUrl.trim();
  }

  const newItem = {
    id: newId,
    name: name.trim(),
    category: category.trim(),
    location: location ? location.trim() : "Ruang Lab Utama",
    totalStock: stockNum,
    availableStock: stockNum,
    borrowedStock: 0,
    unit: unit || "Unit",
    condition: condition || "Baik",
    loanable: loanable || "all",
    loanPolicyText,
    imageUrl: finalImageUrl,
    description: description ? description.trim() : ""
  };

  db.inventory.push(newItem);
  writeDb(db);
  res.status(201).json(newItem);
});

app.put('/api/inventory/:id', requireAdmin, uploadItem.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, category, location, totalStock, unit, condition, loanable, description, imageUrl } = req.body;

  const db = readDb();
  const index = db.inventory.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Barang tidak ditemukan." });
  }

  const item = db.inventory[index];
  const newTotal = parseInt(totalStock);
  const diff = !isNaN(newTotal) ? newTotal - item.totalStock : 0;

  let loanPolicyText = item.loanPolicyText;
  if (loanable === 'all') loanPolicyText = "Boleh Dipinjam (Umum & Internal)";
  if (loanable === 'internal_only') loanPolicyText = "Khusus Internal Lab IoT";
  if (loanable === 'restricted') loanPolicyText = "Aset Tetap Lab (Hanya Digunakan di Ruang Lab)";

  item.name = name ? name.trim() : item.name;
  item.category = category ? category.trim() : item.category;
  item.location = location ? location.trim() : item.location;
  if (!isNaN(newTotal)) {
    item.totalStock = newTotal;
    item.availableStock = Math.max(0, item.availableStock + diff);
  }
  item.unit = unit || item.unit;
  item.condition = condition || item.condition;
  item.loanable = loanable || item.loanable;
  item.loanPolicyText = loanPolicyText;
  item.description = description !== undefined ? description.trim() : item.description;

  if (req.file) {
    item.imageUrl = `/uploads/items/${req.file.filename}`;
  } else if (imageUrl && imageUrl.trim()) {
    item.imageUrl = imageUrl.trim();
  }

  writeDb(db);
  res.json(item);
});

app.delete('/api/inventory/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.inventory.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Barang tidak ditemukan." });
  }
  const deleted = db.inventory.splice(index, 1);
  writeDb(db);
  res.json({ success: true, deleted: deleted[0] });
});

app.get('/api/inventory/:id/qrcode', async (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const item = db.inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: "Barang tidak ditemukan." });

  const qrText = `IOT-LAB-ITEM:${item.id}|${item.name}|LOC:${item.location}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrText, { width: 250, margin: 2 });
    res.json({ qrDataUrl, item });
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat QR Code." });
  }
});

app.post('/api/loans/generate-request', async (req, res) => {
  try {
    const {
      borrowerName,
      borrowerNim,
      borrowerType, 
      institutionName,
      whatsapp,
      email,
      purpose,
      borrowDate,
      returnDate,
      items 
    } = req.body;

    if (!borrowerName || !borrowerNim || !whatsapp || !borrowDate || !returnDate || !items || !items.length) {
      return res.status(400).json({ error: "Mohon lengkapi semua kolom wajib dan pilih minimal satu barang." });
    }

    const db = readDb();

    const processedItems = [];
    for (const reqItem of items) {
      const invItem = db.inventory.find(i => i.id === reqItem.itemId);
      if (!invItem) {
        return res.status(400).json({ error: `Barang dengan ID ${reqItem.itemId} tidak ditemukan di sistem.` });
      }

      if (invItem.loanable === 'restricted') {
        return res.status(400).json({
          error: `Barang "${invItem.name}" adalah ASET TETAP LAB dan TIDAK DIIZINKAN untuk dipinjam.`
        });
      }

      if (invItem.loanable === 'internal_only' && borrowerType !== 'internal_lab') {
        return res.status(400).json({
          error: `Barang "${invItem.name}" KHUSUS INTERNAL LAB IOT. Peminjam dari luar tidak diizinkan mengajukan barang ini.`
        });
      }

      const qty = parseInt(reqItem.qty) || 1;
      if (qty > invItem.availableStock) {
        return res.status(400).json({
          error: `Stok untuk "${invItem.name}" tidak mencukupi (Tersedia: ${invItem.availableStock}, Diminta: ${qty}).`
        });
      }

      processedItems.push({
        itemId: invItem.id,
        name: invItem.name,
        category: invItem.category,
        location: invItem.location,
        qty: qty,
        unit: invItem.unit
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const uniqueId = `IOT-REQ-${year}${month}-${randomHex}`;

    const qrDataText = `https://iotlab.telkomuniversity.ac.id/track/${uniqueId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrDataText, { width: 180, margin: 1 });

    const newLoan = {
      uniqueId,
      createdAt: now.toISOString(),
      status: "SURAT_DIGENERATE", 
      statusLabel: "Surat Dibuat (Menunggu Upload Berkas)",
      borrower: {
        name: borrowerName.trim(),
        nim: borrowerNim.trim(),
        type: borrowerType || "ormawa",
        institutionName: (institutionName || "Internal/Individu").trim(),
        whatsapp: whatsapp.trim(),
        email: email ? email.trim() : ""
      },
      purpose: purpose.trim(),
      borrowDate,
      returnDate,
      items: processedItems,
      documents: {
        signedDocumentUrl: null,
        idCardUrl: null,
        uploadedAt: null
      },
      audit: {
        generatedAt: now.toISOString(),
        verifiedAt: null,
        verifiedBy: null,
        handoverAt: null,
        returnedAt: null,
        notes: ""
      },
      qrCodeDataUrl
    };

    db.loans.push(newLoan);
    writeDb(db);

    res.json({
      success: true,
      uniqueId,
      loan: newLoan,
      qrCodeDataUrl
    });
  } catch (err) {
    console.error("Gagal membuat pengajuan peminjaman:", err);
    res.status(500).json({ error: "Terjadi kesalahan sistem saat membuat permohonan." });
  }
});

app.post('/api/loans/upload-document', uploadLoan.fields([
  { name: 'signedDocument', maxCount: 1 },
  { name: 'idCard', maxCount: 1 }
]), (req, res) => {
  const { uniqueId } = req.body;
  if (!uniqueId) {
    return res.status(400).json({ error: "ID Permohonan (Unique ID) wajib disertakan." });
  }

  const db = readDb();
  const loan = db.loans.find(l => l.uniqueId === uniqueId);
  if (!loan) {
    return res.status(404).json({ error: `Permohonan dengan ID ${uniqueId} tidak ditemukan.` });
  }

  if (!req.files || !req.files['signedDocument']) {
    return res.status(400).json({ error: "Wajib mengunggah scan/foto Surat Peminjaman yang telah ditandatangani." });
  }

  const signedFile = req.files['signedDocument'][0];
  const idCardFile = req.files['idCard'] ? req.files['idCard'][0] : null;

  loan.documents = {
    signedDocumentUrl: `/uploads/loans/${signedFile.filename}`,
    idCardUrl: idCardFile ? `/uploads/loans/${idCardFile.filename}` : loan.documents.idCardUrl,
    uploadedAt: new Date().toISOString()
  };

  loan.status = "MENUNGGU_VERIFIKASI";
  loan.statusLabel = "Menunggu Verifikasi Laboran";

  writeDb(db);

  res.json({
    success: true,
    uniqueId: loan.uniqueId,
    status: loan.status,
    statusLabel: loan.statusLabel,
    message: "Berkas berhasil diunggah! Permohonan Anda sekarang resmi terdaftar dan menunggu verifikasi Pengelola Lab IoT."
  });
});

app.post('/api/loans/submit-full-request', uploadLoan.fields([
  { name: 'signedDocument', maxCount: 1 },
  { name: 'idCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      borrowerName,
      borrowerNim,
      borrowerType,
      institutionName,
      whatsapp,
      email,
      purpose,
      borrowDate,
      returnDate,
      itemsJson
    } = req.body;

    if (!borrowerName || !borrowerNim || !whatsapp || !borrowDate || !returnDate || !itemsJson) {
      return res.status(400).json({ error: "Mohon lengkapi semua data formulir peminjaman." });
    }

    let items = [];
    try {
      items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
    } catch (e) {
      return res.status(400).json({ error: "Format daftar barang tidak valid." });
    }

    if (!items || !items.length) {
      return res.status(400).json({ error: "Pilih minimal satu barang dari daftar inventaris." });
    }

    if (!req.files || !req.files['signedDocument']) {
      return res.status(400).json({ error: "Wajib mengunggah scan/foto Surat Peminjaman Resmi yang telah ditandatangani basah." });
    }

    const db = readDb();

    const processedItems = [];
    for (const reqItem of items) {
      const invItem = db.inventory.find(i => i.id === reqItem.itemId);
      if (!invItem) {
        return res.status(400).json({ error: `Barang dengan ID ${reqItem.itemId} tidak ditemukan.` });
      }

      if (invItem.loanable === 'restricted') {
        return res.status(400).json({ error: `Barang "${invItem.name}" adalah Aset Tetap dan tidak dapat dipinjam.` });
      }

      if (invItem.loanable === 'internal_only' && borrowerType !== 'internal_lab') {
        return res.status(400).json({ error: `Barang "${invItem.name}" khusus untuk internal Lab IoT.` });
      }

      const qty = parseInt(reqItem.qty) || 1;
      if (qty > invItem.availableStock) {
        return res.status(400).json({ error: `Stok "${invItem.name}" tidak mencukupi (Tersedia: ${invItem.availableStock}, Diminta: ${qty}).` });
      }

      processedItems.push({
        itemId: invItem.id,
        name: invItem.name,
        category: invItem.category,
        location: invItem.location,
        qty: qty,
        unit: invItem.unit
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const uniqueId = `IOT-REQ-${year}${month}-${randomHex}`;

    const signedFile = req.files['signedDocument'][0];
    const idCardFile = req.files['idCard'] ? req.files['idCard'][0] : null;

    const qrDataText = `https://iotlab.telkomuniversity.ac.id/track/${uniqueId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrDataText, { width: 180, margin: 1 });

    const newLoan = {
      uniqueId,
      createdAt: now.toISOString(),
      status: "MENUNGGU_VERIFIKASI",
      statusLabel: "Menunggu Verifikasi Laboran",
      borrower: {
        name: borrowerName.trim(),
        nim: borrowerNim.trim(),
        type: borrowerType || "ormawa",
        institutionName: (institutionName || "Internal/Individu").trim(),
        whatsapp: whatsapp.trim(),
        email: email ? email.trim() : ""
      },
      purpose: purpose.trim(),
      borrowDate,
      returnDate,
      items: processedItems,
      documents: {
        signedDocumentUrl: `/uploads/loans/${signedFile.filename}`,
        idCardUrl: idCardFile ? `/uploads/loans/${idCardFile.filename}` : null,
        uploadedAt: now.toISOString()
      },
      audit: {
        generatedAt: now.toISOString(),
        verifiedAt: null,
        verifiedBy: null,
        handoverAt: null,
        returnedAt: null,
        notes: ""
      },
      qrCodeDataUrl
    };

    db.loans.push(newLoan);
    writeDb(db);

    res.json({
      success: true,
      uniqueId,
      loan: newLoan,
      message: "Permohonan peminjaman berhasil dikirim! ID Pelacakan Anda: " + uniqueId
    });

  } catch (err) {
    console.error("Gagal mengirim permohonan peminjaman:", err);
    res.status(500).json({ error: "Terjadi kesalahan sistem saat mengirim permohonan." });
  }
});

app.get('/api/loans/track/:uniqueId', (req, res) => {
  const { uniqueId } = req.params;
  const db = readDb();
  const loan = db.loans.find(l => l.uniqueId.toLowerCase() === uniqueId.toLowerCase());
  if (!loan) {
    return res.status(404).json({ error: "Nomor ID Peminjaman tidak ditemukan. Pastikan kode tiket sudah benar." });
  }
  res.json(loan);
});

app.get('/api/loans', requireAdmin, (req, res) => {
  const { status } = req.query;
  const db = readDb();
  let loans = [...db.loans].reverse();
  if (status && status !== 'all') {
    loans = loans.filter(l => l.status === status);
  }
  res.json(loans);
});

app.patch('/api/loans/:uniqueId/status', requireAdmin, (req, res) => {
  const { uniqueId } = req.params;
  const { newStatus, notes } = req.body;

  const db = readDb();
  const loan = db.loans.find(l => l.uniqueId === uniqueId);
  if (!loan) {
    return res.status(404).json({ error: "Permohonan tidak ditemukan." });
  }

  const prevStatus = loan.status;
  const nowStr = new Date().toISOString();

  if (newStatus === "DISETUJUI") {
    loan.status = "DISETUJUI";
    loan.statusLabel = "Disetujui (Silakan Ambil Barang di Lab)";
    loan.audit.verifiedAt = nowStr;
    loan.audit.verifiedBy = db.admin.name;
    if (notes) loan.audit.notes = notes;
  } else if (newStatus === "DIPINJAM") {

    if (prevStatus !== "DIPINJAM") {
      for (const reqItem of loan.items) {
        const inv = db.inventory.find(i => i.id === reqItem.itemId);
        if (inv) {
          inv.availableStock = Math.max(0, inv.availableStock - reqItem.qty);
          inv.borrowedStock += reqItem.qty;
        }
      }
    }
    loan.status = "DIPINJAM";
    loan.statusLabel = "Sedang Dipinjam";
    loan.audit.handoverAt = nowStr;
    if (notes) loan.audit.notes = notes;
  } else if (newStatus === "SELESAI") {

    if (prevStatus === "DIPINJAM") {
      for (const reqItem of loan.items) {
        const inv = db.inventory.find(i => i.id === reqItem.itemId);
        if (inv) {
          inv.availableStock = Math.min(inv.totalStock, inv.availableStock + reqItem.qty);
          inv.borrowedStock = Math.max(0, inv.borrowedStock - reqItem.qty);
        }
      }
    }
    loan.status = "SELESAI";
    loan.statusLabel = "Selesai (Barang Sudah Dikembalikan)";
    loan.audit.returnedAt = nowStr;
    if (notes) loan.audit.notes = notes;
  } else if (newStatus === "DITOLAK") {
    loan.status = "DITOLAK";
    loan.statusLabel = "Ditolak";
    loan.audit.verifiedAt = nowStr;
    loan.audit.verifiedBy = db.admin.name;
    loan.audit.notes = notes || "Permohonan tidak memenuhi syarat administrasi.";
  }

  writeDb(db);
  res.json({ success: true, loan });
});

app.get('/api/cash/summary', (req, res) => {
  const db = readDb();
  let totalIncome = 0;
  let totalExpense = 0;

  db.cashTransactions.forEach(trx => {
    if (trx.type === 'expense') {
      totalExpense += trx.amount;
    } else {
      totalIncome += trx.amount;
    }
  });

  const balance = totalIncome - totalExpense;

  res.json({
    totalIncome,
    totalExpense,
    balance,
    transactionCount: db.cashTransactions.length,
    activeMembersCount: db.cashMembers.filter(m => m.active).length
  });
});

app.get('/api/cash/periods', requireAdmin, (req, res) => {
  const db = readDb();

  const periodKeys = new Set(Object.keys(db.monthlyTargets || {}));
  (db.cashTransactions || []).forEach(t => {
    if (t.period) periodKeys.add(t.period);
  });

  const currentPeriod = new Date().toISOString().substring(0, 7);
  periodKeys.add(currentPeriod);

  const sortedPeriods = Array.from(periodKeys).sort().reverse();
  const totalMembers = (db.cashMembers || []).length;

  const periodsData = sortedPeriods.map(period => {
    const targetObj = (db.monthlyTargets && db.monthlyTargets[period]) || { targetAmount: 20000, notes: "Target Standar" };
    const targetAmount = targetObj.targetAmount !== undefined ? targetObj.targetAmount : 20000;

    const duesForPeriod = (db.cashTransactions || []).filter(
      t => t.type === 'income_dues' && t.period === period
    );

    let totalPaid = 0;
    let lunasCount = 0;
    let partialCount = 0;

    (db.cashMembers || []).forEach(member => {
      const payments = duesForPeriod.filter(p => p.memberId === member.id);
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      totalPaid += paid;
      if (targetAmount === 0 || paid >= targetAmount) {
        lunasCount++;
      } else if (paid > 0) {
        partialCount++;
      }
    });

    const totalTarget = totalMembers * targetAmount;
    const totalRemaining = Math.max(0, totalTarget - totalPaid);
    const complianceRate = totalMembers > 0 ? Math.round((lunasCount / totalMembers) * 100) : 0;

    let monthLabel = period;
    const parts = period.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const monthDate = new Date(y, m, 1);
      monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }

    return {
      period,
      monthLabel,
      targetAmount,
      notes: targetObj.notes || "",
      totalMembers,
      totalTarget,
      totalPaid,
      totalRemaining,
      lunasCount,
      partialCount,
      unpaidCount: Math.max(0, totalMembers - lunasCount - partialCount),
      complianceRate
    };
  });

  res.json(periodsData);
});

app.get('/api/cash/members', (req, res) => {
  const db = readDb();
  res.json(db.cashMembers || []);
});

app.get('/api/cash/targets', (req, res) => {
  const db = readDb();
  res.json(db.monthlyTargets);
});

app.post('/api/cash/targets', requireAdmin, (req, res) => {
  const { period, targetAmount, notes } = req.body; 
  if (!period || targetAmount === undefined) {
    return res.status(400).json({ error: "Periode (YYYY-MM) dan nominal target wajib diisi." });
  }

  const db = readDb();
  db.monthlyTargets[period] = {
    targetAmount: Math.max(0, parseInt(targetAmount) || 0),
    notes: notes ? notes.trim() : ""
  };

  writeDb(db);
  res.json({ success: true, period, target: db.monthlyTargets[period] });
});

app.get('/api/cash/matrix', (req, res) => {
  const period = req.query.month || new Date().toISOString().substring(0, 7); 
  const db = readDb();

  const targetObj = db.monthlyTargets[period] || { targetAmount: 20000, notes: "Target Standar" };
  const targetAmount = targetObj.targetAmount;

  const duesForPeriod = db.cashTransactions.filter(
    t => t.type === 'income_dues' && t.period === period
  );

  const matrix = db.cashMembers.map(member => {
    const payments = duesForPeriod.filter(p => p.memberId === member.id);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = targetAmount - paidAmount;

    let status = "BELUM_BAYAR";
    let statusLabel = "Belum Bayar";

    if (targetAmount === 0) {
      status = "BEBAS";
      statusLabel = "Bebas Iuran";
    } else if (paidAmount >= targetAmount) {
      status = "LUNAS";
      statusLabel = "Lunas";
    } else if (paidAmount > 0) {
      status = "PARSIAL";
      statusLabel = "Sebagian";
    }

    return {
      memberId: member.id,
      nim: member.nim,
      name: member.name,
      role: member.role,
      targetAmount,
      paidAmount,
      remaining: Math.max(0, remaining),
      status,
      statusLabel,
      payments
    };
  });

  res.json({
    period,
    targetAmount,
    targetNotes: targetObj.notes,
    matrix
  });
});

app.post('/api/cash/pay', requireAdmin, (req, res) => {
  const { memberId, period, amount, paymentMethod, notes } = req.body;
  if (!memberId || !period || !amount) {
    return res.status(400).json({ error: "Anggota, periode bulan, dan nominal bayar wajib diisi." });
  }

  const db = readDb();
  const member = db.cashMembers.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: "Anggota tidak ditemukan." });
  }

  const trxId = `CASH-TRX-${String(db.cashTransactions.length + 1).padStart(3, '0')}`;
  const newTrx = {
    id: trxId,
    date: new Date().toISOString().substring(0, 10),
    type: "income_dues",
    memberId: member.id,
    memberName: member.name,
    period,
    amount: parseInt(amount),
    paymentMethod: paymentMethod || "Cash",
    notes: notes ? notes.trim() : "Pembayaran kas bulanan",
    receiptFile: null
  };

  db.cashTransactions.push(newTrx);
  writeDb(db);

  res.json({ success: true, transaction: newTrx });
});

app.post('/api/cash/expenses', requireAdmin, uploadReceipt.single('receipt'), (req, res) => {
  const { category, amount, paymentMethod, description } = req.body;
  if (!category || !amount || !description) {
    return res.status(400).json({ error: "Kategori, jumlah nominal, dan rincian belanja wajib diisi." });
  }

  const db = readDb();
  const trxId = `EXP-TRX-${String(db.cashTransactions.length + 1).padStart(3, '0')}`;

  const newExpense = {
    id: trxId,
    date: req.body.date ? req.body.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
    type: "expense",
    category: category.trim(),
    amount: parseInt(amount),
    paymentMethod: paymentMethod || "Transfer",
    description: description.trim(),
    receiptFile: req.file ? `/uploads/receipts/${req.file.filename}` : null,
    recordedBy: db.admin.name
  };

  db.cashTransactions.push(newExpense);
  writeDb(db);

  res.json({ success: true, expense: newExpense });
});

app.post('/api/cash/incomes', requireAdmin, (req, res) => {
  const { sourceName, amount, paymentMethod, notes, date } = req.body;
  if (!sourceName || !amount) {
    return res.status(400).json({ error: "Sumber pemasukan dan nominal wajib diisi." });
  }

  const db = readDb();
  const trxId = `INC-TRX-${String(db.cashTransactions.length + 1).padStart(3, '0')}`;
  const trxDate = date ? date.substring(0, 10) : new Date().toISOString().substring(0, 10);

  const newIncome = {
    id: trxId,
    date: trxDate,
    type: "income_other",
    memberId: null,
    memberName: sourceName.trim(),
    period: trxDate.substring(0, 7),
    amount: parseInt(amount),
    paymentMethod: paymentMethod || "Transfer",
    notes: notes ? notes.trim() : "Pemasukan eksternal / hibah lab",
    receiptFile: null
  };

  db.cashTransactions.push(newIncome);
  writeDb(db);

  res.json({ success: true, income: newIncome });
});

app.get('/api/cash/transactions', (req, res) => {
  const db = readDb();
  res.json([...db.cashTransactions].reverse());
});

app.get('/api/cash/members', (req, res) => {
  const db = readDb();
  res.json(db.cashMembers);
});

app.post('/api/cash/members', requireAdmin, (req, res) => {
  const { nim, name, role } = req.body;
  if (!nim || !name) {
    return res.status(400).json({ error: "NIM dan nama anggota wajib diisi." });
  }

  const db = readDb();
  const newMember = {
    id: `MBR-${String(db.cashMembers.length + 1).padStart(2, '0')}`,
    nim: nim.trim(),
    name: name.trim(),
    role: role ? role.trim() : "Anggota Lab",
    active: true
  };

  db.cashMembers.push(newMember);
  writeDb(db);
  res.status(201).json(newMember);
});

app.listen(PORT, () => {
  console.log(`=== SISTEM LAB IOT TELKOM UNIVERSITY BERJALAN ===`);
  console.log(`Port: http://localhost:${PORT}`);
});
