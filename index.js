const express = require("express");
const QRCode = require("qrcode");
const cors = require("cors");
const { createCanvas, loadImage } = require("canvas");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

let qrStore = {}; // memory storage for expiry

// Helper: Expiry check
function isExpired(id) {
    if (!qrStore[id]) return false;
    return Date.now() > qrStore[id].expiry;
}

// Home
app.get("/", (req, res) => {
    res.json({
        message: "🔥 Sovit Advanced QR API Running",
        usage: "/api/qr?type=text&data=Hello"
    });
});

// Generate QR
app.get("/api/qr", async (req, res) => {

    const {
        type = "text",
        data,
        size = 300,
        fg = "#000000",
        bg = "#ffffff",
        ec = "H",
        amount,
        upi,
        note,
        expiryDays = 30
    } = req.query;

    if (!data && type !== "upi") {
        return res.status(400).json({ error: "Data required" });
    }

    let qrData = data;

    // UPI format
    if (type === "upi") {
        if (!upi || !amount) {
            return res.status(400).json({ error: "UPI and amount required" });
        }
        qrData = `upi://pay?pa=${upi}&am=${amount}&tn=${note || ""}`;
    }

    // Email
    if (type === "email") {
        qrData = `mailto:${data}`;
    }

    // Phone
    if (type === "phone") {
        qrData = `tel:${data}`;
    }

    // SMS
    if (type === "sms") {
        qrData = `smsto:${data}:${note || ""}`;
    }

    // WiFi
    if (type === "wifi") {
        qrData = `WIFI:T:WPA;S:${data};P:${note || ""};;`;
    }

    // vCard
    if (type === "vcard") {
        qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${data}\nTEL:${note || ""}\nEND:VCARD`;
    }

    try {
        const canvas = createCanvas(size, size);
        await QRCode.toCanvas(canvas, qrData, {
            width: size,
            errorCorrectionLevel: ec,
            color: {
                dark: fg,
                light: bg
            }
        });

        const ctx = canvas.getContext("2d");

        // Logo embed (optional local logo.png)
        try {
            const logo = await loadImage("logo.png");
            const logoSize = size / 4;
            ctx.drawImage(
                logo,
                size / 2 - logoSize / 2,
                size / 2 - logoSize / 2,
                logoSize,
                logoSize
            );
        } catch {}

        const id = uuidv4();
        qrStore[id] = {
            expiry: Date.now() + expiryDays * 24 * 60 * 60 * 1000
        };

        res.setHeader("Content-Type", "image/png");
        canvas.createPNGStream().pipe(res);

    } catch (err) {
        res.status(500).json({ error: "QR generation failed" });
    }
});

app.listen(PORT, () => {
    console.log("🚀 Advanced QR API running on port " + PORT);
});
