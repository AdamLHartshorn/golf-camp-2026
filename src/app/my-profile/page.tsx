"use client";

import Cropper, { Area, Point } from "react-easy-crop";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
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
          "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, photo_url, pin_code",
        )
        .eq("id", nextSession.id)
        .single();

      if (fetchError) {
        setError(fetchError.message || "Could not load profile.");
        setIsLoading(false);
        return;
      }

      setPlayer(data as ProfilePlayer);
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
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, photo_url, pin_code",
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
        "id, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, photo_url, pin_code",
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
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/camp-office" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            My Profile
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#34312a] bg-[#151411] font-mono text-xs font-black">
            ID
          </span>
        </div>

        {isLoading && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-sm text-[#7a6f60]">
            Loading profile...
          </div>
        )}

        {!isLoading && !session && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-[#17130e] shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
            <p className="text-sm text-[#7a6f60]">
              Log in with a player PIN to manage your profile.
            </p>
            <Link
              href="/"
              className="mt-4 block rounded-xl bg-[#17130e] px-4 py-3 text-center font-semibold text-[#efe9dc]"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && player && (
          <>
            <section className="overflow-hidden rounded-[1.65rem] border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              <div className="border-b border-[#d8d1c4] px-5 py-5">
              <div className="mb-4 flex justify-center">
                {player.photo_url ? (
                  <div
                    aria-label={`${player.display_name} profile`}
                    className="h-28 w-28 rounded-full border border-[#cfc4b3] bg-cover bg-center shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
                    role="img"
                    style={{ backgroundImage: `url(${player.photo_url})` }}
                  />
                ) : (
                  <PlayerSilhouette
                    className="h-28 w-28"
                    label={`${player.display_name} profile placeholder`}
                  />
                )}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a6f60]">
                Logged-In Player
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
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
                  ["Phone", player.phone || "-"],
                  ["Email", player.email || "-"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">
                  Profile Picture
                </h2>
                <p className="mt-1 text-sm text-[#a3a3a3]">
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

            <section className="space-y-3 rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Change PIN</h2>
              <p className="text-sm text-[#a3a3a3]">
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
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
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
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
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
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                />
              </div>
              <button
                type="button"
                onClick={handleChangePin}
                disabled={isSaving}
                className="w-full rounded-xl bg-[#efe9dc] px-4 py-3 font-semibold text-[#17130e] transition hover:bg-[#f6f0e3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Update PIN"}
              </button>
            </section>
          </>
        )}

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/home"
            className="rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-semibold text-[#a3a3a3]"
          >
            Back
          </Link>
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#242424] px-4 py-3 text-sm font-semibold text-[#a3a3a3]"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
