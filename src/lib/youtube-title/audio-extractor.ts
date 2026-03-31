import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24MB
const CHUNK_OVERLAP_SEC = 30;

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function extractAudioFromVideo(
  file: File,
  onProgress?: (msg: string) => void
): Promise<File[]> {
  onProgress?.("음성 처리 엔진 로딩 중...");
  const ff = await getFFmpeg();

  onProgress?.("영상 파일 읽는 중...");
  const inputName = "input" + getExt(file.name);
  await ff.writeFile(inputName, await fetchFile(file));

  onProgress?.("오디오 추출 중... (잠시 소요)");
  await ff.exec([
    "-i", inputName,
    "-vn",           // 영상 제거
    "-ac", "1",      // 모노
    "-ar", "16000",  // 16kHz
    "-b:a", "64k",   // 64kbps
    "output.mp3",
  ]);

  // 입력 파일 메모리에서 삭제
  await ff.deleteFile(inputName);

  const outputData = await ff.readFile("output.mp3");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioBlob = new Blob([(outputData as any).buffer || outputData], { type: "audio/mpeg" });
  await ff.deleteFile("output.mp3");

  onProgress?.(`오디오 추출 완료 (${formatSize(audioBlob.size)})`);

  // 25MB 이하면 그대로 반환
  if (audioBlob.size <= WHISPER_MAX_SIZE) {
    return [new File([audioBlob], "audio.mp3", { type: "audio/mpeg" })];
  }

  // 25MB 초과면 분할
  onProgress?.("오디오가 크므로 분할 중...");
  return await splitAudio(ff, audioBlob, onProgress);
}

async function splitAudio(
  ff: FFmpeg,
  audioBlob: Blob,
  onProgress?: (msg: string) => void
): Promise<File[]> {
  await ff.writeFile("full.mp3", new Uint8Array(await audioBlob.arrayBuffer()));

  // 오디오 길이 확인
  let durationSec = 0;
  const logLines: string[] = [];
  ff.on("log", ({ message }) => logLines.push(message));
  await ff.exec(["-i", "full.mp3", "-f", "null", "-"]);
  for (const line of logLines) {
    const m = line.match(/Duration:\s*(\d+):(\d+):(\d+)/);
    if (m) {
      durationSec = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
    }
  }

  if (durationSec === 0) {
    // 길이 파악 실패 시 크기 기반 추정 (64kbps = 8KB/s)
    durationSec = Math.ceil(audioBlob.size / 8000);
  }

  // 청크당 목표 크기 → 시간 계산
  const bytesPerSec = audioBlob.size / durationSec;
  const chunkDurationSec = Math.floor(WHISPER_MAX_SIZE / bytesPerSec);
  const chunks: File[] = [];
  let startSec = 0;
  let idx = 0;

  while (startSec < durationSec) {
    const endSec = Math.min(startSec + chunkDurationSec, durationSec);
    const outName = `chunk_${idx}.mp3`;

    onProgress?.(`분할 중... (${idx + 1}번째 조각, ${formatTime(startSec)}~${formatTime(endSec)})`);

    await ff.exec([
      "-i", "full.mp3",
      "-ss", String(startSec),
      "-t", String(endSec - startSec),
      "-c", "copy",
      outName,
    ]);

    const chunkData = await ff.readFile(outName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunks.push(new File([(chunkData as any).buffer || chunkData], outName, { type: "audio/mpeg" }));
    await ff.deleteFile(outName);

    startSec = endSec - CHUNK_OVERLAP_SEC; // 30초 겹침
    if (startSec >= durationSec) break;
    idx++;
  }

  await ff.deleteFile("full.mp3");
  onProgress?.(`${chunks.length}개 조각으로 분할 완료`);
  return chunks;
}

function getExt(filename: string): string {
  const m = filename.match(/\.[^.]+$/);
  return m ? m[0].toLowerCase() : ".mp4";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
