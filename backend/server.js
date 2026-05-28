require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { AccessToken } = require("livekit-server-sdk");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/getToken", async (req, res) => {
  try {
    const { name, role, room, username } = req.query;

    if (!room || !username) {
      return res.status(400).json({
        error: "room and username are required",
      });
    }

    const participantRole = role === "admin" ? "admin" : "client";
    const canPublish = participantRole !== "admin";

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        attributes: {
          role: participantRole,
        },
        identity: username,
        metadata: JSON.stringify({
          role: participantRole,
        }),
        name: name || username,
      }
    );

    at.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canPublishData: canPublish,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to generate token",
    });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Token server running on port 3001");
});
