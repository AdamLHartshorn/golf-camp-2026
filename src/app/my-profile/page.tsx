"use client";

import Cropper, { Area, Point } from "react-easy-crop";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  clearPlayerSession,
  getPlayerSession,
  PlayerSession,
} from "@/lib/playerSession";
import { getPublicDisplayRank } from "@/lib/playerRanks";

type ProfilePlayer = {
  id: string;
  display_name: string;
  nickname: string | null;
  rank: string | null;
  display_rank: string | null;
  internal_rank_order: string | null;
  years_served: number | null;
  room: string | null;
  arrival: string | null;
  phone: string | null;
  email: string | null;
  phone_number: string | null;
  email_address: string | null;
  photo_url: string | null;
  pin_code: string | null;
};

function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

async function getCroppedImageBlob(imageSrc: string, crop: Area) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.min(crop.width, crop.height);

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare image crop.");
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    size,
    size,
    0,
    0,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function MyProfilePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [player, setPlayer] = useState<ProfilePlayer | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [yearsServed, setYearsServed] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    window.setTimeout(async () => {
      const nextSession = getPlayerSession();
      setSession(nextSession);

      if (!nextSession) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, pin_code",
        )
        .eq("id", nextSession.id)
        .single();

      if (fetchError) {
        setError(fetchError.message || "Could not load profile.");
        setIsLoading(false);
        return;
      }

      const loadedPlayer = data as ProfilePlayer;
      setPlayer(loadedPlayer);
      setPhoneNumber(loadedPlayer.phone_number || loadedPlayer.phone || "");
      setEmailAddress(loadedPlayer.email_address || loadedPlayer.email || "");
      setYearsServed(
        typeof loadedPlayer.years_served === "number"
          ? String(loadedPlayer.years_served)
          : "",
      );
      setIsLoading(false);
    }, 0);
  }, []);

  function handleLogout() {
    clearPlayerSession();
    router.push("/");
  }

  async function handleChangePin() {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    if (currentPin.trim() !== (player.pin_code || "")) {
      setError("Current PIN is incorrect.");
      return;
    }

    if (!newPin.trim() || newPin.trim() !== confirmPin.trim()) {
      setError("New PIN and confirmation must match.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        pin_code: newPin.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select(
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, pin_code",
      )
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update PIN.");
      return;
    }

    setPlayer(data as ProfilePlayer);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setMessage("PIN updated.");
    await logAuditEvent({
      actionType: "player_pin_changed",
      entityType: "player",
      entityId: player.id,
      summary: `${player.display_name} changed their PIN.`,
    });
  }

  async function handleSaveContactInfo() {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        phone_number: phoneNumber.trim() || null,
        email_address: emailAddress.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select(
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, pin_code",
      )
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update contact info.");
      return;
    }

    const updatedPlayer = data as ProfilePlayer;
    setPlayer(updatedPlayer);
    setPhoneNumber(updatedPlayer.phone_number || "");
    setEmailAddress(updatedPlayer.email_address || "");
    setMessage("Contact info updated.");
    await logAuditEvent({
      actionType: "player_contact_updated",
      entityType: "player",
      entityId: player.id,
      summary: `${player.display_name} updated contact information.`,
      oldValue: {
        phone_number: player.phone_number,
        email_address: player.email_address,
      },
      newValue: {
        phone_number: updatedPlayer.phone_number,
        email_address: updatedPlayer.email_address,
      },
    });
  }

  async function handleSaveCampIdentity() {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    const trimmedYearsServed = yearsServed.trim();
    const parsedYearsServed = trimmedYearsServed
      ? Number(trimmedYearsServed)
      : null;

    if (
      parsedYearsServed !== null &&
      (!Number.isInteger(parsedYearsServed) || parsedYearsServed < 0)
    ) {
      setError("Years Served must be a whole number.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        years_served: parsedYearsServed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select(
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, pin_code",
      )
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update Years Served.");
      return;
    }

    const updatedPlayer = data as ProfilePlayer;
    setPlayer(updatedPlayer);
    setYearsServed(
      typeof updatedPlayer.years_served === "number"
        ? String(updatedPlayer.years_served)
        : "",
    );
    setMessage("Years Served updated.");
    await logAuditEvent({
      actionType: "player_years_served_updated",
      entityType: "player",
      entityId: player.id,
      summary: `${player.display_name} updated Years Served.`,
      oldValue: { years_served: player.years_served },
      newValue: { years_served: updatedPlayer.years_served },
    });
  }

  function resetCropper() {
    if (cropImageUrl) {
      window.URL.revokeObjectURL(cropImageUrl);
    }

    setCropImageUrl("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handlePhotoSelection(file: File | null) {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    const extensionFromName = file.name.split(".").pop()?.toLowerCase();
    const extensionFromType = file.type.split("/").pop()?.toLowerCase();
    const extension = extensionFromName || extensionFromType || "jpg";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

    if (!allowedExtensions.includes(extension)) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }

    resetCropper();
    setCropImageUrl(window.URL.createObjectURL(file));
  }

  async function handlePhotoUpload() {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    if (!cropImageUrl || !croppedAreaPixels) {
      setError("Position your photo before saving.");
      return;
    }

    setIsUploadingPhoto(true);

    let croppedBlob: Blob;

    try {
      croppedBlob = await getCroppedImageBlob(cropImageUrl, croppedAreaPixels);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Could not crop profile photo.",
      );
      setIsUploadingPhoto(false);
      return;
    }

    const filePath = `${player.id}/profile.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, croppedBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });

    console.log("Self-service player photo upload:", {
      playerId: player.id,
      path: filePath,
      data: uploadData,
      error: uploadError,
    });

    if (uploadError) {
      setError(uploadError.message || "Could not upload profile photo.");
      setIsUploadingPhoto(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("player-photos")
      .getPublicUrl(uploadData.path);
    const photoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select(
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, pin_code",
      )
      .single();

    console.log("Self-service player photo url update:", {
      playerId: player.id,
      photoUrl,
      data,
      error: updateError,
    });

    setIsUploadingPhoto(false);

    if (updateError) {
      setError(updateError.message || "Could not save profile photo.");
      return;
    }

    setPlayer(data as ProfilePlayer);
    resetCropper();
    setMessage("Profile picture updated.");
    await logAuditEvent({
      actionType: "player_photo_updated",
      entityType: "player",
      entityId: player.id,
      summary: `${player.display_name} updated profile photo.`,
      newValue: { photo_url: photoUrl },
    });
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/camp-office" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">
            My Profile
          </p>
          <ThemeToggle className="px-2.5 py-2" />
        </div>

        {isLoading && (
          <div className="gc-edge-card p-5 text-sm text-[#b8b0a1]">
            Loading profile...
          </div>
        )}

        {!isLoading && !session && (
          <div className="gc-edge-card p-5">
            <p className="text-sm text-[#7a6f60]">
              Log in with a player PIN to manage your profile.
            </p>
            <Link
              href="/"
              className="gc-primary-button mt-4 block text-center"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && player && (
          <>
            <section className="player-identity-card overflow-hidden rounded-[0.65rem] border border-[#d7c9ad]/28 bg-[radial-gradient(circle_at_50%_-20%,rgba(244,241,234,0.16),transparent_15rem),linear-gradient(180deg,rgba(24,22,18,0.98),rgba(8,8,8,0.96))] text-[#f4f1ea] shadow-[0_22px_70px_rgba(0,0,0,0.42)]">
              <div className="border-b border-[#d7c9ad]/18 px-5 py-6 text-center">
                <div className="mb-4 flex justify-center">
                  {player.photo_url ? (
                    <div
                      aria-label={`${player.display_name} profile`}
                      className="player-profile-photo h-28 w-28 rounded-full border-2 border-[#d7c9ad]/60 bg-cover bg-center shadow-[0_18px_46px_rgba(0,0,0,0.38)]"
                      role="img"
                      style={{ backgroundImage: `url(${player.photo_url})` }}
                    />
                  ) : (
                    <PlayerSilhouette
                      className="player-profile-photo h-28 w-28 border-2 border-[#d7c9ad]/45 bg-[#11100e] text-[#f4f1ea]"
                      label={`${player.display_name} profile placeholder`}
                    />
                  )}
                </div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#d7c9ad]">
                  Logged-In Player
                </p>
                <h1 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[#f4f1ea]">
                  {player.display_name}
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 text-sm">
                {[
                  ["Rank", getPublicDisplayRank(player.display_rank, player.rank)],
                  [
                    "Years Served",
                    typeof player.years_served === "number"
                      ? String(player.years_served)
                      : "-",
                  ],
                  ["Room", player.room || "-"],
                  ["Arrival", player.arrival || "TBD"],
                  ["Phone", player.phone_number || player.phone || "-"],
                  ["Email", player.email_address || player.email || "-"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="player-stat-chip rounded-[0.5rem] border border-[#d7c9ad]/22 bg-[#f4f1ea]/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d7c9ad]">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm font-black leading-5 text-[#f4f1ea]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="gc-edge-card space-y-3 p-5">
              <h2 className="gc-card-title">
                Camp Identity
              </h2>
              <p className="gc-card-copy">
                Keep your roster card current with a little earned seniority.
              </p>

              <div>
                <label
                  htmlFor="profile-years-served"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Years Served
                </label>
                <input
                  id="profile-years-served"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={yearsServed}
                  onChange={(event) => {
                    setYearsServed(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Years Served"
                  className="gc-input"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveCampIdentity}
                disabled={isSaving}
                className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Camp Identity"}
              </button>
            </section>

            <section className="gc-edge-card space-y-3 p-5">
              <h2 className="gc-card-title">
                Contact Info
              </h2>
              <p className="gc-card-copy">
                Optional. This powers your downloadable contact card in the Camp
                Roster.
              </p>

              <div>
                <label
                  htmlFor="profile-phone-number"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Phone Number
                </label>
                <input
                  id="profile-phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Phone Number"
                  className="gc-input"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email-address"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Email Address
                </label>
                <input
                  id="profile-email-address"
                  type="email"
                  value={emailAddress}
                  onChange={(event) => {
                    setEmailAddress(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Email Address"
                  className="gc-input"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveContactInfo}
                disabled={isSaving}
                className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Contact Info"}
              </button>
            </section>

            <section className="gc-edge-card space-y-3 p-5">
              <div>
                <h2 className="gc-card-title">
                  Profile Picture
                </h2>
                <p className="gc-card-copy">
                  Upload a photo for roster cards and your public profile.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Upload Profile Picture
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    handlePhotoSelection(event.target.files?.[0] || null);
                    event.target.value = "";
                  }}
                  disabled={isUploadingPhoto}
                  className="block w-full text-sm text-[#a3a3a3] file:mr-4 file:rounded-xl file:border-0 file:bg-[#efe9dc] file:px-4 file:py-3 file:text-sm file:font-semibold file:text-[#17130e] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              {cropImageUrl && (
                <div className="space-y-4 rounded-2xl border border-[#34312a] bg-black/35 p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#f5f5f5]">
                      Position your photo
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#a3a3a3]">
                      Drag to center your face, then zoom until it feels right
                      inside the circular frame.
                    </p>
                  </div>

                  <div className="relative h-72 overflow-hidden rounded-2xl border border-[#242424] bg-black">
                    <Cropper
                      image={cropImageUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, croppedPixels) =>
                        setCroppedAreaPixels(croppedPixels)
                      }
                    />
                  </div>

                  <label
                    htmlFor="profile-photo-zoom"
                    className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                  >
                    Zoom
                  </label>
                  <input
                    id="profile-photo-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="w-full accent-[#efe9dc]"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={resetCropper}
                      disabled={isUploadingPhoto}
                      className="rounded-xl border border-[#34312a] px-4 py-3 text-sm font-semibold text-[#a3a3a3] transition hover:border-[#efe9dc] hover:text-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="rounded-xl bg-[#efe9dc] px-4 py-3 text-sm font-semibold text-[#17130e] transition hover:bg-[#f8f2e6] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploadingPhoto ? "Saving..." : "Save Photo"}
                    </button>
                  </div>
                </div>
              )}

              {isUploadingPhoto && (
                <p className="text-sm text-[#a3a3a3]">
                  Saving cropped profile photo...
                </p>
              )}
            </section>

            <section className="gc-edge-card space-y-3 p-5">
              <h2 className="gc-card-title">Change PIN</h2>
              <p className="gc-card-copy">
                Enter your current PIN, then choose a new one.
              </p>
              <div>
                <label
                  htmlFor="current-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Current PIN
                </label>
                <input
                  id="current-pin"
                  type="text"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(event) => {
                    setCurrentPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Current PIN"
                  className="gc-input"
                />
              </div>
              <div>
                <label
                  htmlFor="new-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  New PIN
                </label>
                <input
                  id="new-pin"
                  type="text"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => {
                    setNewPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="New PIN"
                  className="gc-input"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-new-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Confirm New PIN
                </label>
                <input
                  id="confirm-new-pin"
                  type="text"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => {
                    setConfirmPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Confirm New PIN"
                  className="gc-input"
                />
              </div>
              <button
                type="button"
                onClick={handleChangePin}
                disabled={isSaving}
                className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Update PIN"}
              </button>
            </section>
          </>
        )}

        {message && (
          <p className="rounded-[0.55rem] border border-[#d7c9ad]/20 bg-[#f4f1ea]/8 px-4 py-3 text-center text-sm font-semibold text-[#f4f1ea]">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-[0.55rem] border border-[#ff8a8a]/35 bg-[#3a1010]/55 px-4 py-3 text-center text-sm font-semibold text-[#ffb4b4]">
            {error}
          </p>
        )}

        <div className="grid gap-3">
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[0.55rem] border border-[#34312a] px-4 py-3 text-sm font-semibold text-[#a3a3a3] transition hover:border-[#d7c9ad]/45 hover:text-[#f4f1ea]"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
