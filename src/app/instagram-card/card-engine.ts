// @ts-nocheck
import JSZip from 'jszip';

// ===== Types =====
interface CardMakerOptions {
  workerId: string;
  onNavigateHome: () => void;
}

interface CardMakerInstance {
  destroy: () => void;
}

// ===== HTML Template =====
function buildHTML(): string {
  return `
  <!-- Header -->
  <header class="header">
    <div class="header-inner">
      <button class="header-btn back-btn" id="backBtn" title="돌아가기">
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>돌아가기</span>
      </button>
      <p class="header-desc">인스타 카드뉴스 메이커</p>
      <div class="header-actions hidden" id="headerActions">
        <button class="header-btn" id="saveProjectBtn" title="프로젝트 저장 (Ctrl+S)">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 21v-8H7v8M7 3v5h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <span>저장</span>
        </button>
        <button class="header-btn" id="homeBtn" title="홈으로">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span>홈</span>
        </button>
        <button class="header-btn" id="downloadCurrentBtn" title="현재 카드 다운로드">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 19h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span>현재 카드</span>
        </button>
        <button class="header-btn primary" id="downloadAllBtn" title="전체 ZIP 다운로드">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 19h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span>ZIP 다운로드</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Home Screen -->
  <main id="homeScreen" class="home-screen">
    <div class="home-content">
      <h2 class="home-title">내 프로젝트</h2>
      <div class="home-actions">
        <button class="home-new-btn" id="newProjectBtn">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span>새 프로젝트</span>
        </button>
      </div>
      <div class="project-list" id="projectList">
        <p class="project-empty" id="projectEmpty">저장된 프로젝트가 없습니다</p>
      </div>
    </div>
  </main>

  <!-- Upload Screen -->
  <main id="uploadScreen" class="upload-screen hidden">
    <div id="dropZone" class="drop-zone">
      <svg class="upload-icon" viewBox="0 0 64 64" width="64" height="64">
        <path d="M32 8 L32 40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M20 20 L32 8 L44 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M8 40 L8 52 A4 4 0 0 0 12 56 L52 56 A4 4 0 0 0 56 52 L56 40" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>
      <p class="drop-text">영상 파일을 드래그하거나 <span class="browse-link">파일 선택</span></p>
      <p class="drop-subtext">MP4, WebM, MOV, AVI 등 대부분의 영상 포맷 지원</p>
      <input type="file" id="fileInput" accept="video/*" hidden>
    </div>
    <div class="upload-progress hidden" id="uploadProgress">
      <div class="upload-progress-bar"><div class="upload-progress-fill" id="uploadProgressFill"></div></div>
      <p class="upload-progress-text" id="uploadProgressText">영상 업로드 중... 0%</p>
    </div>
    <div class="privacy-notice">
      <svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 2 L3 6 L3 11 C3 15.4 6 18.5 10 20 C14 18.5 17 15.4 17 11 L17 6 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 10 L9 12 L13 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>영상을 선택하면 클라우드에 자동 업로드됩니다.</span>
    </div>
  </main>

  <!-- Editor Screen -->
  <main id="editorScreen" class="editor-screen hidden">
    <div class="workspace">
      <!-- ===== LEFT: Card News (main) ===== -->
      <section class="main-panel">
        <div class="card-preview-area">
          <div class="card-preview" id="cardPreview"></div>
        </div>
      </section>

      <!-- Resize Handle -->
      <div class="resize-handle" id="resizeHandle"></div>

      <!-- ===== RIGHT: Frame Extractor ===== -->
      <aside class="side-panel" id="sidePanel">
        <!-- Floating video overlay -->
        <div class="video-float collapsed" id="videoFloat">
          <button class="video-float-close" id="videoFloatClose">&times;</button>
          <div class="video-float-inner">
            <div class="video-section">
              <div class="video-wrapper">
                <video id="videoPlayer" class="video-player" playsinline webkit-playsinline preload="metadata"></video>
                <div class="video-overlay" id="videoOverlay">
                  <button class="play-btn-overlay"><svg viewBox="0 0 24 24" width="40" height="40"><polygon points="6,3 20,12 6,21" fill="white"/></svg></button>
                </div>
              </div>
              <div class="video-controls">
                <input type="range" id="timeline" class="timeline" min="0" max="100" step="0.001" value="0">
                <div class="controls-row">
                  <div class="controls-left">
                    <button class="ctrl-btn" id="playPauseBtn" title="Space">
                      <svg id="playIcon" viewBox="0 0 24 24" width="18" height="18"><polygon points="6,3 20,12 6,21" fill="currentColor"/></svg>
                      <svg id="pauseIcon" viewBox="0 0 24 24" width="18" height="18" class="hidden"><rect x="5" y="3" width="4" height="18" fill="currentColor"/><rect x="15" y="3" width="4" height="18" fill="currentColor"/></svg>
                    </button>
                    <button class="ctrl-btn" id="prevFrameBtn" title="←"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4L6 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18 4L8 12L18 20" fill="currentColor"/></svg></button>
                    <button class="ctrl-btn" id="nextFrameBtn" title="→"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M18 4L18 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M6 4L16 12L6 20" fill="currentColor"/></svg></button>
                    <span class="time-display" id="timeDisplay">00:00 / 00:00</span>
                  </div>
                  <span class="video-info" id="videoInfo"></span>
                </div>
              </div>
            </div>
            <div class="extract-panel">
              <div class="extract-row">
                <div class="extract-sub">
                  <span class="extract-label">추출 프레임 수</span>
                  <input type="number" id="totalFrames" class="num-input" value="10" min="1" max="9999">
                  <span class="input-hint">개</span>
                </div>
                <div class="extract-sub">
                  <span class="extract-label">프레임 간격</span>
                  <input type="number" id="intervalValue" class="num-input" value="1" min="0.1" step="0.1">
                  <select id="intervalUnit" class="select-input"><option value="seconds">초</option><option value="frames">프레임</option></select>
                </div>
                <button class="extract-btn" id="extractBtn">추출</button>
              </div>
              <div class="progress-container hidden" id="progressContainer">
                <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                <div class="progress-info"><span id="progressText">0/0</span><button class="cancel-link" id="cancelBtn">취소</button></div>
              </div>
            </div>
          </div>
        </div>
        <!-- Frames strip (always full) -->
        <div class="frames-strip">
          <div class="frames-strip-header">
            <button class="toggle-video-btn" id="toggleVideoBtn" title="영상 열기">
              <svg viewBox="0 0 24 24" width="14" height="14"><polygon points="6,3 20,12 6,21" fill="currentColor"/></svg>
              <span id="toggleVideoText">영상 &amp; 추출</span>
            </button>
            <span class="strip-title">추출된 프레임 <span class="strip-count" id="stripCount">0</span></span>
            <button class="strip-clear-btn" id="stripClearBtn">전체 삭제</button>
          </div>
          <div class="frames-scroll" id="framesScroll">
            <div class="frames-empty" id="framesEmpty">프레임을 추출하면 여기에 표시됩니다</div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Card Carousel (bottom) -->
    <div class="carousel-section" id="carouselSection">
      <button class="carousel-toggle" id="carouselToggle">
        <svg id="carouselToggleIcon" viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="carousel-body" id="carouselBody">
        <div class="carousel-scroll" id="carouselScroll"></div>
        <button class="carousel-add-btn" id="addCardBtn" title="페이지 추가">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  </main>

  <!-- Subtitle Remover Modal -->
  <div class="sub-modal hidden" id="subModal">
    <div class="sub-modal-inner">
      <div class="sub-modal-header">
        <span class="sub-modal-title">자막 제거</span>
        <div class="sub-modal-tools">
          <label class="sub-tool-label">브러시 크기</label>
          <input type="range" id="subBrushSize" min="10" max="100" value="40" class="sub-brush-slider">
          <button class="header-btn" id="subUndoBtn">되돌리기</button>
          <button class="header-btn primary" id="subApplyBtn">적용</button>
          <button class="header-btn" id="subCancelBtn">취소</button>
        </div>
      </div>
      <div class="sub-canvas-wrap" id="subCanvasWrap">
        <canvas id="subCanvas"></canvas>
        <canvas id="subMaskCanvas"></canvas>
      </div>
      <p class="sub-hint">자막 위를 드래그하여 칠하세요. 칠한 영역이 자동으로 채워집니다.</p>
    </div>
  </div>

  <!-- Save Confirm Modal -->
  <div class="confirm-modal hidden" id="confirmModal">
    <div class="confirm-modal-inner">
      <p class="confirm-message">저장하지 않은 변경사항이 있습니다.</p>
      <div class="confirm-actions">
        <button class="confirm-btn cancel" id="confirmCancel">취소</button>
        <button class="confirm-btn discard" id="confirmDiscard">저장안함</button>
        <button class="confirm-btn save" id="confirmSave">저장</button>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer"></div>
  `;
}

// ===== Main Init Function =====
export function initCardMaker(container: HTMLElement, options: CardMakerOptions): CardMakerInstance {
  const { workerId, onNavigateHome } = options;

  // Build HTML
  container.innerHTML = buildHTML();

  // Scoped DOM query helper
  const $ = (id: string) => container.querySelector('#' + id) as HTMLElement;

  // ===== DOM References =====
  const homeScreen = $('homeScreen');
  const projectList = $('projectList');
  const projectEmpty = $('projectEmpty');
  const newProjectBtn = $('newProjectBtn');
  const dropZone = $('dropZone');
  const fileInput = $('fileInput') as HTMLInputElement;
  const uploadScreen = $('uploadScreen');
  const editorScreen = $('editorScreen');
  const headerActions = $('headerActions');
  const saveProjectBtn = $('saveProjectBtn');
  const homeBtn = $('homeBtn');
  const videoPlayer = $('videoPlayer') as HTMLVideoElement;
  const videoOverlay = $('videoOverlay');
  const playPauseBtn = $('playPauseBtn');
  const playIcon = $('playIcon');
  const pauseIcon = $('pauseIcon');
  const prevFrameBtn = $('prevFrameBtn');
  const nextFrameBtn = $('nextFrameBtn');
  const timeline = $('timeline') as HTMLInputElement;
  const timeDisplay = $('timeDisplay');
  const videoInfo = $('videoInfo');
  const extractBtn = $('extractBtn') as HTMLButtonElement;
  const progressContainer = $('progressContainer');
  const progressFill = $('progressFill');
  const progressText = $('progressText');
  const cancelBtn = $('cancelBtn');
  const stripClearBtn = $('stripClearBtn');
  const framesScroll = $('framesScroll');
  const framesEmpty = $('framesEmpty');
  const stripCount = $('stripCount');
  const cardPreview = $('cardPreview');
  const carouselScroll = $('carouselScroll');
  const downloadCurrentBtn = $('downloadCurrentBtn');
  const downloadAllBtn = $('downloadAllBtn') as HTMLButtonElement;
  const toastContainer = $('toastContainer');
  const addCardBtn = $('addCardBtn');
  const carouselSection = $('carouselSection');
  const carouselToggle = $('carouselToggle');
  const mainPanel = container.querySelector('.main-panel') as HTMLElement;
  const cardPreviewArea = container.querySelector('.card-preview-area') as HTMLElement;
  const toggleVideoBtn = $('toggleVideoBtn');
  const videoFloat = $('videoFloat');
  const videoFloatClose = $('videoFloatClose');
  const backBtn = $('backBtn');

  // Subtitle remover
  const subModal = $('subModal');
  const subCanvas = $('subCanvas') as HTMLCanvasElement;
  const subMaskCanvas = $('subMaskCanvas') as HTMLCanvasElement;
  const subCanvasWrap = $('subCanvasWrap');
  const subBrushSize = $('subBrushSize') as HTMLInputElement;
  const subApplyBtn = $('subApplyBtn');
  const subCancelBtn = $('subCancelBtn');
  const subUndoBtn = $('subUndoBtn');

  // ===== State =====
  let capturedFrames: any[] = [];
  let cards: any[] = [];
  let selectedCardIndex = 0;
  let activeTarget: any = null;
  let selectedCards: number[] = [0];
  let videoFileName = '';
  let currentVideoBlob: File | null = null;
  let videoSavedForProject = false;
  let estimatedFPS = 30;
  let isExtracting = false;
  let cancelExtraction = false;
  let thumbnailTitle = '';
  let undoStack: any[] = [];
  let redoStack: any[] = [];
  let currentProjectId: string | null = null;
  let currentProjectName = '';
  let hasUnsavedChanges = false;
  const MAX_UNDO = 30;
  const MAX_CARDS = 10;
  let carouselCollapsed = false;
  let clipboardCards: any[] = [];

  // Subtitle remover state
  let subCtx: CanvasRenderingContext2D;
  let subMaskCtx: CanvasRenderingContext2D;
  let subImg: HTMLImageElement;
  let subFrameData: any;
  let subCardIndex: number;
  let subSlot: string;
  let subPainting = false;
  let subHistory: ImageData[] = [];

  // Cleanup tracking
  const abortController = new AbortController();
  const signal = abortController.signal;
  let resizeObserver: ResizeObserver | null = null;
  let allCardsObserver: IntersectionObserver | null = null;

  // ===== Init Cards =====
  function initCards() {
    cards = [{ type: 'thumbnail', image: null }];
    for (let i = 1; i < MAX_CARDS; i++) cards.push({ type: 'split', top: null, bottom: null });
    activeTarget = { cardIndex: 0, slot: 'image' };
  }
  initCards();

  // ===== API Helpers =====
  async function apiGetProjects(): Promise<any[]> {
    try {
      const res = await fetch(`/api/card-projects?workerId=${encodeURIComponent(workerId)}`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function apiGetProject(id: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/card-projects/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function apiCreateProject(data: any): Promise<any> {
    const res = await fetch('/api/card-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workerId }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return await res.json();
  }

  async function apiUpdateProject(id: string, data: any): Promise<void> {
    const res = await fetch(`/api/card-projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update project');
  }

  async function apiDeleteProject(id: string): Promise<void> {
    const res = await fetch(`/api/card-projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  async function apiUploadVideo(projectId: string, file: File, onProgress?: (pct: number) => void): Promise<{ fileKey: string }> {
    // Get presigned URL
    const res = await fetch(`/api/card-projects/${encodeURIComponent(projectId)}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type || 'video/mp4', fileName: file.name }),
    });
    if (!res.ok) throw new Error('Failed to get upload URL');
    const { uploadUrl, fileKey } = await res.json();

    // Upload directly to R2
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Upload network error'));
      xhr.send(file);
    });

    return { fileKey };
  }

  async function apiSaveFrames(projectId: string, frameId: string, base64: string): Promise<void> {
    const res = await fetch(`/api/card-projects/${encodeURIComponent(projectId)}/frames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameId, base64 }),
    });
    if (!res.ok) throw new Error('Failed to save frame');
  }

  async function apiGetVideoUrl(projectId: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/card-projects/${encodeURIComponent(projectId)}/video`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  }

  // ===== Upload =====
  dropZone.addEventListener('click', () => fileInput.click(), { signal });
  dropZone.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); dropZone.classList.add('dragover'); }, { signal });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'), { signal });
  dropZone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const f = e.dataTransfer?.files[0];
    if (f?.type.startsWith('video/')) loadVideo(f);
    else toast('영상 파일만 업로드 가능합니다.', 'error');
  }, { signal });
  fileInput.addEventListener('change', (e: Event) => { if ((e.target as HTMLInputElement).files?.[0]) loadVideo((e.target as HTMLInputElement).files![0]); }, { signal });

  async function loadVideo(file: File) {
    currentVideoBlob = file;
    videoSavedForProject = false;
    videoFileName = file.name.replace(/\.[^.]+$/, '');
    videoPlayer.removeAttribute('crossOrigin');
    isExtracting = false;
    cancelExtraction = false;
    extractBtn.disabled = false;
    progressContainer.classList.add('hidden');

    // Show upload progress UI (stay on upload screen)
    const dz = $('dropZone');
    const uploadProg = $('uploadProgress');
    const uploadFill = $('uploadProgressFill');
    const uploadText = $('uploadProgressText');
    dz.style.display = 'none';
    uploadProg.classList.remove('hidden');
    uploadFill.style.width = '0%';
    uploadText.textContent = '프로젝트 생성 중...';

    try {
      // Create project via API
      if (!currentProjectId) {
        const projectData = await apiCreateProject({
          name: videoFileName || '새 프로젝트',
          thumbnailTitle: '',
          cards: [{ type: 'thumbnail', image: null }],
          thumbData: null,
          cardCount: MAX_CARDS,
        });
        currentProjectId = projectData.id;
        currentProjectName = projectData.name || videoFileName || '새 프로젝트';
      }

      // Upload video with progress
      uploadText.textContent = '영상 업로드 중... 0%';
      const { fileKey } = await apiUploadVideo(currentProjectId!, file, (pct) => {
        uploadFill.style.width = pct + '%';
        uploadText.textContent = `영상 업로드 중... ${pct}%`;
      });

      await apiUpdateProject(currentProjectId!, { videoKey: fileKey, videoName: videoFileName });
      videoSavedForProject = true;
      uploadText.textContent = '완료!';
    } catch (err) {
      console.error('Upload error:', err);
      uploadText.textContent = '업로드 실패. 다시 시도해주세요.';
      uploadProg.classList.add('hidden');
      dz.style.display = '';
      return; // Stay on upload screen
    }

    // Upload done -> enter editor
    uploadProg.classList.add('hidden');
    dz.style.display = '';

    const blobUrl = URL.createObjectURL(file);
    videoPlayer.onloadedmetadata = () => {
      timeline.max = String(videoPlayer.duration);
      updateTime(); updateInfo(); detectFPS();
    };
    videoPlayer.src = blobUrl;
    videoPlayer.load();

    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    headerActions.classList.remove('hidden');
    history.pushState({ screen: 'editor', projectId: currentProjectId }, '', `#project/${currentProjectId}`);
    renderCarousel(); renderCardPreview(); updateHint();
    setVideoVisible(true);
    hasUnsavedChanges = false;
  }

  function detectFPS() {
    if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return;
    const onFirstPlay = () => {
      videoPlayer.removeEventListener('play', onFirstPlay);
      let last: number | null = null;
      let deltas: number[] = [];
      let n = 0;
      const cb = (_: any, m: any) => {
        if (last !== null) { const d = m.mediaTime - last; if (d > 0) deltas.push(d); }
        last = m.mediaTime;
        if (++n < 30) (videoPlayer as any).requestVideoFrameCallback(cb);
        else {
          if (deltas.length > 5) estimatedFPS = Math.round(1 / (deltas.reduce((a: number, b: number) => a + b) / deltas.length));
          updateInfo();
        }
      };
      (videoPlayer as any).requestVideoFrameCallback(cb);
    };
    videoPlayer.addEventListener('play', onFirstPlay);
  }

  // ===== Video Controls =====
  function togglePlay() { videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause(); }
  videoOverlay.addEventListener('click', togglePlay, { signal });
  videoPlayer.addEventListener('click', togglePlay, { signal });
  playPauseBtn.addEventListener('click', togglePlay, { signal });

  videoPlayer.addEventListener('play', () => { playIcon.classList.add('hidden'); pauseIcon.classList.remove('hidden'); videoOverlay.classList.add('playing'); }, { signal });
  videoPlayer.addEventListener('pause', () => { playIcon.classList.remove('hidden'); pauseIcon.classList.add('hidden'); videoOverlay.classList.remove('playing'); }, { signal });
  videoPlayer.addEventListener('timeupdate', () => { if (!(timeline as any)._d) timeline.value = String(videoPlayer.currentTime); updateTime(); updateTlBg(); }, { signal });

  timeline.addEventListener('mousedown', () => (timeline as any)._d = true, { signal });
  timeline.addEventListener('touchstart', () => (timeline as any)._d = true, { signal });
  timeline.addEventListener('input', () => { videoPlayer.currentTime = +timeline.value; updateTime(); updateTlBg(); }, { signal });
  timeline.addEventListener('mouseup', () => (timeline as any)._d = false, { signal });
  timeline.addEventListener('touchend', () => (timeline as any)._d = false, { signal });

  prevFrameBtn.addEventListener('click', () => { videoPlayer.pause(); videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 1 / estimatedFPS); }, { signal });
  nextFrameBtn.addEventListener('click', () => { videoPlayer.pause(); videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 1 / estimatedFPS); }, { signal });

  function updateTlBg() { const p = (videoPlayer.currentTime / videoPlayer.duration) * 100 || 0; timeline.style.background = `linear-gradient(to right,var(--ig-blue) ${p}%,var(--track-bg) ${p}%)`; }
  function updateTime() { timeDisplay.textContent = `${fmt(videoPlayer.currentTime)} / ${fmt(videoPlayer.duration)}`; }
  function updateInfo() { videoInfo.textContent = `${videoPlayer.videoWidth}×${videoPlayer.videoHeight} · ${estimatedFPS}fps`; }

  // ===== Keyboard Shortcuts =====
  function handleKeydown(e: KeyboardEvent) {
    if (editorScreen.classList.contains('hidden')) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (selectedCardIndex > 0) selectCard(selectedCardIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (selectedCardIndex < cards.length - 1) selectCard(selectedCardIndex + 1); }
    else if (e.key === 'Enter' && !isExtracting) { e.preventDefault(); extractFrames(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectedCards.length > 1) {
        saveUndo();
        const toDelete = selectedCards.filter((i: number) => i > 0).sort((a: number, b: number) => b - a);
        toDelete.forEach((i: number) => {
          const card = cards[i];
          if (card.type === 'split') {
            if (card.top) { card.top.assignment = null; updateFrameBadge(card.top); }
            if (card.bottom) { card.bottom.assignment = null; updateFrameBadge(card.bottom); }
          }
          cards.splice(i, 1);
        });
        rebuildAssignments();
        selectedCardIndex = Math.min(selectedCardIndex, cards.length - 1);
        selectedCards = [selectedCardIndex];
        activeTarget = findNextEmptySlot();
        renderCarousel();
        renderCardPreview();
      } else if (selectedCardIndex > 0) {
        deleteCard(selectedCardIndex);
      }
    }
    else if (e.key === 'c' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); copyCard(); }
    else if (e.key === 'v' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pasteCard(); }
    else if (e.key === 'x' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); cutCard(); }
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); redo(); }
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undo(); }
    else if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveProject(); }
  }
  document.addEventListener('keydown', handleKeydown, { signal });

  // ===== Card Preview Fit =====
  function fitCardToArea() {
    if (carouselCollapsed) return;
    const card = cardPreviewArea.querySelector('.card-preview') as HTMLElement;
    if (!card) return;
    const aw = cardPreviewArea.clientWidth - 16;
    const ah = cardPreviewArea.clientHeight - 16;
    if (aw <= 0 || ah <= 0) return;
    const cardRatio = 1080 / 1350;
    const areaRatio = aw / ah;
    if (areaRatio > cardRatio) {
      card.style.width = Math.floor(ah * cardRatio) + 'px';
      card.style.height = ah + 'px';
    } else {
      card.style.width = aw + 'px';
      card.style.height = Math.floor(aw / cardRatio) + 'px';
    }
  }

  resizeObserver = new ResizeObserver(fitCardToArea);
  resizeObserver.observe(cardPreviewArea);

  // ===== Toggle Carousel =====
  carouselToggle.addEventListener('click', () => {
    carouselCollapsed = !carouselCollapsed;
    carouselSection.classList.toggle('collapsed', carouselCollapsed);

    if (carouselCollapsed) {
      mainPanel.classList.add('all-cards-mode');
      renderAllCards();
    } else {
      mainPanel.classList.remove('all-cards-mode');
      restoreSinglePreview();
    }
  }, { signal });

  function renderAllCards() {
    cardPreviewArea.innerHTML = '';
    for (let i = 0; i < cards.length; i++) {
      const item = document.createElement('div');
      item.className = 'all-card-item' + (i === selectedCardIndex ? ' selected' : '');
      item.dataset.ci = String(i);

      const label = document.createElement('div');
      label.className = 'page-label';
      label.textContent = `${i + 1} 페이지`;

      const cp = document.createElement('div');
      cp.className = 'card-preview';

      const card = cards[i];
      if (card.type === 'thumbnail') {
        const s = makeSlot(card.image, i, 'image', '썸네일');
        s.style.flex = '1';
        cp.appendChild(s);

        const ta = document.createElement('textarea');
        ta.className = 'card-title-input';
        ta.placeholder = '제목을 입력해주세요';
        ta.value = thumbnailTitle;
        ta.rows = 3;
        ta.addEventListener('input', () => {
          thumbnailTitle = ta.value; hasUnsavedChanges = true;
          renderCarouselItem(0);
        });
        ta.addEventListener('click', (e: Event) => e.stopPropagation());
        s.appendChild(ta);
      } else {
        cp.appendChild(makeSlot(card.top, i, 'top', '상단'));
        cp.appendChild(makeSlot(card.bottom, i, 'bottom', '하단'));
      }

      item.appendChild(label);
      item.appendChild(cp);
      item.addEventListener('click', () => {
        selectedCardIndex = i;
        cardPreviewArea.querySelectorAll('.all-card-item').forEach((el: Element, idx: number) => {
          el.classList.toggle('selected', idx === i);
        });
        renderCarouselItem(i);
      });
      cardPreviewArea.appendChild(item);
    }
    // Scroll to selected card
    requestAnimationFrame(() => {
      const sel = cardPreviewArea.querySelector(`.all-card-item[data-ci="${selectedCardIndex}"]`) as HTMLElement;
      if (sel) sel.scrollIntoView({ behavior: 'instant', block: 'center' });
    });

    // Auto-select card on scroll
    if (allCardsObserver) allCardsObserver.disconnect();
    allCardsObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const ci = parseInt((entry.target as HTMLElement).dataset.ci!);
          if (ci !== selectedCardIndex) {
            selectedCardIndex = ci;
            cardPreviewArea.querySelectorAll('.all-card-item').forEach((el: Element) =>
              el.classList.toggle('selected', parseInt((el as HTMLElement).dataset.ci!) === ci));
            renderCarouselItem(ci);
          }
        }
      });
    }, { root: mainPanel, threshold: 0.5 });

    cardPreviewArea.querySelectorAll('.all-card-item').forEach((el: Element) =>
      allCardsObserver!.observe(el));
  }

  function restoreSinglePreview() {
    if (allCardsObserver) { allCardsObserver.disconnect(); allCardsObserver = null; }
    selectedCards = [selectedCardIndex];
    cardPreviewArea.innerHTML = '';
    const cp = document.createElement('div');
    cp.className = 'card-preview';
    cp.id = 'cardPreview';
    cardPreviewArea.appendChild(cp);
    renderCarousel();
    renderCardPreview();
  }

  // ===== Toggle Video Float =====
  function isMobile() { return window.innerWidth <= 900; }

  function setVideoVisible(show: boolean) {
    videoFloat.classList.toggle('collapsed', !show);
    if (isMobile()) {
      const mp = container.querySelector('.main-panel') as HTMLElement;
      const carousel = $('carouselSection');
      const header = container.querySelector('.header') as HTMLElement;
      if (mp) mp.style.display = show ? 'none' : '';
      if (carousel) carousel.style.display = show ? 'none' : '';
      if (header) header.style.display = show ? 'none' : '';
      if (show && videoPlayer.readyState >= 2) {
        videoPlayer.currentTime = videoPlayer.currentTime;
      }
    }
  }

  function showVideoReselect() {
    const wrapper = container.querySelector('.video-wrapper') as HTMLElement;
    if (!wrapper) return;
    const existing = wrapper.querySelector('.video-reselect');
    if (existing) return;
    const div = document.createElement('div');
    div.className = 'video-reselect';
    div.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#aaa;z-index:5;';
    div.innerHTML = `<p style="font-size:13px;">영상을 다시 선택해주세요</p><label style="padding:8px 16px;background:var(--ig-blue);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;">영상 선택<input type="file" accept="video/*" hidden></label>`;
    div.querySelector('input')!.addEventListener('change', (e: Event) => {
      if ((e.target as HTMLInputElement).files?.[0]) {
        const file = (e.target as HTMLInputElement).files![0];
        currentVideoBlob = file;
        videoSavedForProject = false;
        if (!videoFileName) videoFileName = file.name.replace(/\.[^.]+$/, '');
        videoPlayer.onloadedmetadata = () => {
          timeline.max = String(videoPlayer.duration);
          updateTime(); updateInfo(); detectFPS();
          div.remove();
        };
        videoPlayer.src = URL.createObjectURL(file);
        videoPlayer.load();
        // Auto-upload video for this project
        if (currentProjectId) {
          saveVideoToCloud(currentProjectId).catch(() => {});
        }
      }
    });
    wrapper.appendChild(div);
    setVideoVisible(true);
  }

  toggleVideoBtn.addEventListener('click', () => setVideoVisible(true), { signal });
  videoFloatClose.addEventListener('click', () => setVideoVisible(false), { signal });

  // ===== Frame Extraction =====
  extractBtn.addEventListener('click', extractFrames, { signal });
  cancelBtn.addEventListener('click', () => cancelExtraction = true, { signal });
  stripClearBtn.addEventListener('click', () => {
    if (!capturedFrames.length) return;
    const keep: any[] = [];
    capturedFrames.forEach(f => {
      if (f.assignment) {
        keep.push(f);
      } else {
        URL.revokeObjectURL(f.url);
        framesScroll.querySelector(`[data-id="${f.id}"]`)?.remove();
      }
    });
    capturedFrames = keep;
    if (!capturedFrames.length) framesEmpty.style.display = '';
    stripCount.textContent = String(capturedFrames.length);
  }, { signal });

  async function extractFrames() {
    if (isExtracting) return;
    if (!videoPlayer.duration || isNaN(videoPlayer.duration)) {
      toast('영상이 아직 로딩되지 않았습니다.', 'error');
      return;
    }

    capturedFrames.forEach(f => {
      if (!f.assignment) {
        URL.revokeObjectURL(f.url);
        framesScroll.querySelector(`[data-id="${f.id}"]`)?.remove();
      }
    });
    capturedFrames = capturedFrames.filter(f => f.assignment);
    framesEmpty.style.display = 'none';

    const dur = videoPlayer.duration;
    const intervalVal = parseFloat(($('intervalValue') as HTMLInputElement).value);
    const intervalUnit = ($('intervalUnit') as HTMLSelectElement).value;
    const maxCount = parseInt(($('totalFrames') as HTMLInputElement).value);

    if (intervalVal <= 0) return toast('간격은 0보다 커야 합니다.', 'error');
    if (maxCount < 1) return toast('1개 이상 지정해주세요.', 'error');

    let ts: number[] = [];
    const startTime = videoPlayer.currentTime;

    if (intervalUnit === 'seconds') {
      for (let i = 0; i < maxCount; i++) {
        const t = startTime + i * intervalVal;
        if (t >= dur) break;
        ts.push(t);
      }
    } else {
      const frameDur = 1 / estimatedFPS;
      const frameInterval = Math.max(1, Math.round(intervalVal));
      for (let i = 0; i < maxCount; i++) {
        const t = startTime + i * frameInterval * frameDur;
        if (t >= dur) break;
        ts.push(t);
      }
    }
    if (!ts.length) return toast('추출할 프레임이 없습니다.', 'error');
    if (ts.length > 5000) return toast('최대 5000프레임까지 가능합니다.', 'error');

    isExtracting = true; cancelExtraction = false;
    extractBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressFill.style.width = '0%';
    videoPlayer.pause();

    const cv = document.createElement('canvas');
    cv.width = videoPlayer.videoWidth; cv.height = videoPlayer.videoHeight;
    const cx = cv.getContext('2d')!;
    let ext = 0;

    try {
      for (let i = 0; i < ts.length; i++) {
        if (cancelExtraction) break;
        await seekTo(ts[i]);
        cx.drawImage(videoPlayer, 0, 0, cv.width, cv.height);
        const blob = await new Promise<Blob | null>((resolve, reject) => {
          try { cv.toBlob(b => resolve(b), 'image/png'); }
          catch (e) { reject(e); }
        });
        if (!blob) continue;
        const frame = { id: Date.now() + '_' + i, url: URL.createObjectURL(blob), blob, time: ts[i], assignment: null };
        capturedFrames.push(frame);
        addFrameToStrip(frame);
        ext++;
        const pct = Math.round((i + 1) / ts.length * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = `${i + 1}/${ts.length}`;
      }
    } catch (err: any) {
      console.error('Extract error:', err);
      toast(`추출 오류: ${err.message}`, 'error');
    }

    isExtracting = false; extractBtn.disabled = false;
    progressContainer.classList.add('hidden');
    stripCount.textContent = String(capturedFrames.length);
    toast(cancelExtraction ? `취소됨. ${ext}개 추출.` : `${ext}개 프레임 추출 완료`, cancelExtraction ? 'error' : 'success');

    if (ext > 0) setVideoVisible(false);
  }

  function seekTo(t: number): Promise<void> {
    return new Promise(r => {
      videoPlayer.currentTime = t;
      const h = () => { videoPlayer.removeEventListener('seeked', h); requestAnimationFrame(() => requestAnimationFrame(r)); };
      videoPlayer.addEventListener('seeked', h);
    });
  }

  // ===== Frame Strip =====
  function addFrameToStrip(frame: any) {
    framesEmpty.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'frame-thumb-item';
    el.dataset.id = frame.id;
    el.innerHTML = `<img src="${frame.url}"><div class="frame-thumb-time">${fmt(frame.time)}</div>`;
    el.addEventListener('click', () => onFrameClick(frame));
    framesScroll.appendChild(el);
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function onFrameClick(frame: any) {
    if (frame.assignment) {
      removeFrameFromCard(frame);
    } else {
      const target = findEmptySlotInCard(selectedCardIndex) || activeTarget || findNextEmptySlot();
      if (!target) return toast('배치할 슬롯이 없습니다.', 'error');
      placeFrameInCard(frame, target);
    }
  }

  function findEmptySlotInCard(ci: number) {
    const c = cards[ci];
    if (!c) return null;
    if (c.type === 'thumbnail') {
      if (!c.image) return { cardIndex: ci, slot: 'image' };
    } else {
      if (!c.top) return { cardIndex: ci, slot: 'top' };
      if (!c.bottom) return { cardIndex: ci, slot: 'bottom' };
    }
    return null;
  }

  function updateFrameBadge(frame: any) {
    const el = framesScroll.querySelector(`[data-id="${frame.id}"]`);
    if (!el) return;
    el.querySelector('.frame-badge')?.remove();
    if (frame.assignment) {
      el.classList.add('assigned');
      const b = document.createElement('div');
      b.className = 'frame-badge';
      const num = frame.assignment.cardIndex + 1;
      const pos = frame.assignment.slot === 'image' ? '' : frame.assignment.slot === 'top' ? '-1' : '-2';
      b.textContent = num + pos;
      el.appendChild(b);
    } else {
      el.classList.remove('assigned');
    }
  }

  // ===== Card Management =====
  function findNextEmptySlot(afterTarget?: any) {
    const startCard = afterTarget ? afterTarget.cardIndex : 0;
    const startSlot = afterTarget ? afterTarget.slot : null;

    for (let i = startCard; i < cards.length; i++) {
      const c = cards[i];
      if (c.type === 'thumbnail') {
        if (!c.image && (i > startCard || !startSlot)) return { cardIndex: i, slot: 'image' };
      } else {
        if (!c.top) {
          if (i > startCard || !startSlot || startSlot === 'image') return { cardIndex: i, slot: 'top' };
        }
        if (!c.bottom) {
          if (i > startCard || startSlot === 'top' || startSlot === 'image') return { cardIndex: i, slot: 'bottom' };
        }
      }
    }
    for (let i = 0; i < startCard; i++) {
      const c = cards[i];
      if (c.type === 'thumbnail' && !c.image) return { cardIndex: i, slot: 'image' };
      if (c.type === 'split') {
        if (!c.top) return { cardIndex: i, slot: 'top' };
        if (!c.bottom) return { cardIndex: i, slot: 'bottom' };
      }
    }
    return null;
  }

  function placeFrameInCard(frame: any, target: any) {
    saveUndo();
    const card = cards[target.cardIndex];
    const slotKey = card.type === 'thumbnail' ? 'image' : target.slot;

    if (card[slotKey]) return toast('이미 채워진 슬롯입니다. 다른 슬롯을 선택하세요.', 'error');

    frame.assignment = { cardIndex: target.cardIndex, slot: slotKey };
    card[slotKey] = frame;

    activeTarget = findNextEmptySlot(target);

    updateFrameBadge(frame);
    renderCarouselItem(target.cardIndex);
    selectCard(target.cardIndex);
    updateHint();
  }

  function removeFrameFromCard(frame: any) {
    if (!frame.assignment) return;
    saveUndo();
    const { cardIndex, slot } = frame.assignment;
    const card = cards[cardIndex];
    if (card.type === 'thumbnail') card.image = null;
    else card[slot] = null;
    frame.assignment = null;
    activeTarget = { cardIndex, slot };
    updateFrameBadge(frame);
    renderCarouselItem(cardIndex);
    selectCard(cardIndex);
    updateHint();
  }

  function removeSlotFromCard(cardIndex: number, slot: string) {
    saveUndo();
    const card = cards[cardIndex];
    const frame = card.type === 'thumbnail' ? card.image : card[slot];
    if (card.type === 'thumbnail') card.image = null;
    else card[slot] = null;
    if (frame) { frame.assignment = null; updateFrameBadge(frame); }
    activeTarget = { cardIndex, slot };
    renderCardPreview();
    renderCarouselItem(cardIndex);
    updateHint();
  }

  function updateHint() {}

  // ===== Card Preview =====
  function getCardPreview() {
    return container.querySelector('#cardPreview') as HTMLElement || cardPreview;
  }

  function renderCardPreview() {
    if (carouselCollapsed) { renderAllCards(); return; }
    const cp = getCardPreview();
    fitCardToArea();
    const card = cards[selectedCardIndex];
    cp.innerHTML = '';

    if (card.type === 'thumbnail') {
      const slot = makeSlot(card.image, selectedCardIndex, 'image', '썸네일 이미지');
      slot.style.flex = '1';
      cp.appendChild(slot);

      const ta = document.createElement('textarea');
      ta.className = 'card-title-input';
      ta.placeholder = '제목을 입력해주세요';
      ta.value = thumbnailTitle;
      ta.rows = 3;
      ta.addEventListener('input', () => {
        thumbnailTitle = ta.value; hasUnsavedChanges = true;
        renderCarouselItem(0);
      });
      ta.addEventListener('click', (e: Event) => e.stopPropagation());
      slot.appendChild(ta);
    } else {
      cp.appendChild(makeSlot(card.top, selectedCardIndex, 'top', '상단 이미지'));
      cp.appendChild(makeSlot(card.bottom, selectedCardIndex, 'bottom', '하단 이미지'));
    }
  }

  function makeSlot(frameData: any, ci: number, slot: string, label: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'card-slot';
    const isTgt = activeTarget && activeTarget.cardIndex === ci && activeTarget.slot === slot;

    if (frameData) {
      const isThumbnail = ci === 0 && slot === 'image';
      if (frameData.tx === undefined) { frameData.tx = 0; frameData.ty = 0; }
      if (frameData.scale === undefined) { frameData.scale = 1; }
      const img = document.createElement('img');
      img.src = frameData.url;
      img.className = 'slot-img';
      img.draggable = false;

      if (isThumbnail) {
        const updateImg = () => {
          const sw = el.offsetWidth, sh = el.offsetHeight;
          const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
          if (!sw || !sh) return;
          const s = frameData.scale;
          const coverRatio = Math.max(sw / nw, sh / nh);
          const w = nw * coverRatio * s, h = nh * coverRatio * s;
          const maxTx = Math.max(0, (w - sw) / 2);
          const maxTy = Math.max(0, (h - sh) / 2);
          frameData.tx = Math.max(-maxTx, Math.min(maxTx, frameData.tx));
          frameData.ty = Math.max(-maxTy, Math.min(maxTy, frameData.ty));
          img.style.width = w + 'px';
          img.style.height = h + 'px';
          img.style.left = ((sw - w) / 2 + frameData.tx) + 'px';
          img.style.top = ((sh - h) / 2 + frameData.ty) + 'px';
        };
        img.onload = updateImg;
        requestAnimationFrame(updateImg);

        // Drag
        let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
        img.addEventListener('mousedown', (e: MouseEvent) => {
          dragging = true;
          startX = e.clientX; startY = e.clientY;
          startTx = frameData.tx; startTy = frameData.ty;
          img.style.cursor = 'grabbing';
          e.preventDefault();
        });
        const onMouseMove = (e: MouseEvent) => {
          if (!dragging) return;
          frameData.tx = startTx + (e.clientX - startX);
          frameData.ty = startTy + (e.clientY - startY);
          updateImg();
        };
        const onMouseUp = () => {
          if (dragging) { dragging = false; img.style.cursor = ''; renderCarouselItem(ci); }
        };
        document.addEventListener('mousemove', onMouseMove, { signal });
        document.addEventListener('mouseup', onMouseUp, { signal });

        // Zoom
        el.addEventListener('wheel', (e: WheelEvent) => {
          e.preventDefault();
          frameData.scale = Math.max(1, Math.min(3, frameData.scale + (e.deltaY > 0 ? -0.05 : 0.05)));
          updateImg();
          renderCarouselItem(ci);
        }, { passive: false });
      } else {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.position = 'absolute';
        img.style.left = '0';
        img.style.top = '0';
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'slot-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); removeSlotFromCard(ci, slot); });

      // Subtitle remove button
      const subBtn = document.createElement('button');
      subBtn.className = 'slot-sub-btn';
      subBtn.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 12h12M4 8h8M6 4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>자막 제거';
      subBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); openSubRemover(frameData, ci, slot); });

      el.appendChild(img);
      el.appendChild(removeBtn);
      el.appendChild(subBtn);
    } else {
      el.classList.add('empty');
      if (isTgt) el.classList.add('active-target');
      el.innerHTML = `<div class="card-slot-placeholder"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>${label}</span></div>`;
    }

    el.addEventListener('click', () => {
      if (frameData) return;
      activeTarget = { cardIndex: ci, slot };
      renderCardPreview();
      updateHint();
    });

    return el;
  }

  // ===== Carousel =====
  function applyCarouselImgStyle(img: HTMLImageElement, fd: any, slot: HTMLElement) {
    img.style.position = 'absolute';
    img.onload = () => {
      const sw = slot.offsetWidth || 64, sh = slot.offsetHeight || 80;
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const s = fd.scale || 1;
      const r = Math.max(sw / nw, sh / nh);
      const w = nw * r * s, h = nh * r * s;
      const ratio = sw / 400;
      img.style.width = w + 'px'; img.style.height = h + 'px';
      img.style.left = ((sw - w) / 2 + (fd.tx || 0) * ratio) + 'px';
      img.style.top = ((sh - h) / 2 + (fd.ty || 0) * ratio) + 'px';
    };
  }

  function renderCarousel() {
    carouselScroll.innerHTML = '';
    for (let i = 0; i < cards.length; i++) carouselScroll.appendChild(makeCarouselItem(i));
  }

  function makeCarouselItem(i: number): HTMLElement {
    const card = cards[i], item = document.createElement('div');
    item.className = 'carousel-item' + (i === selectedCardIndex ? ' selected' : '');
    item.dataset.index = String(i);

    const thumb = document.createElement('div');
    thumb.className = 'carousel-thumb';

    if (card.type === 'thumbnail') {
      const s = document.createElement('div');
      s.className = 'carousel-thumb-slot' + (card.image ? '' : ' empty-slot');
      if (card.image) {
        const img = document.createElement('img');
        img.src = card.image.url;
        applyCarouselImgStyle(img, card.image, s);
        s.appendChild(img);
      }
      thumb.appendChild(s);
    } else {
      for (const k of ['top', 'bottom']) {
        const s = document.createElement('div');
        s.className = 'carousel-thumb-slot' + (card[k] ? '' : ' empty-slot');
        if (card[k]) {
          const img = document.createElement('img');
          img.src = card[k].url;
          applyCarouselImgStyle(img, card[k], s);
          s.appendChild(img);
        }
        thumb.appendChild(s);
      }
    }

    // Delete button (not on first card - thumbnail)
    if (i > 0) {
      const del = document.createElement('button');
      del.className = 'carousel-delete';
      del.innerHTML = '&times;';
      del.addEventListener('click', (e: Event) => { e.stopPropagation(); deleteCard(i); });
      item.appendChild(del);
    }

    const num = document.createElement('div');
    num.className = 'carousel-num';
    num.textContent = String(i + 1);

    item.appendChild(thumb);
    item.appendChild(num);
    item.addEventListener('click', (e: MouseEvent) => {
      if (e.shiftKey && selectedCardIndex !== i) {
        const from = Math.min(selectedCardIndex, i);
        const to = Math.max(selectedCardIndex, i);
        selectedCards = [];
        for (let j = from; j <= to; j++) selectedCards.push(j);
        updateCarouselSelection();
      } else if (e.metaKey || e.ctrlKey) {
        if (selectedCards.includes(i)) {
          if (selectedCards.length > 1) {
            selectedCards = selectedCards.filter(j => j !== i);
            if (selectedCardIndex === i) selectedCardIndex = selectedCards[0];
          }
        } else {
          selectedCards.push(i);
          selectedCardIndex = i;
        }
        updateCarouselSelection();
        renderCardPreview();
      } else {
        selectedCards = [i];
        selectCard(i);
      }
    });

    // Drag & drop reorder
    item.draggable = true;
    item.addEventListener('dragstart', (e: DragEvent) => {
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', String(i));
      item.classList.add('dragging');
      setTimeout(() => item.style.opacity = '0.4', 0);
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '';
      item.classList.remove('dragging');
      carouselScroll.querySelectorAll('.carousel-item').forEach((el: Element) => el.classList.remove('drag-over-left', 'drag-over-right'));
    });
    item.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      const rect = item.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      item.classList.toggle('drag-over-left', e.clientX < mid);
      item.classList.toggle('drag-over-right', e.clientX >= mid);
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-left', 'drag-over-right');
    });
    item.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer!.getData('text/plain'));
      const rect = item.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      let to = e.clientX < mid ? i : i + 1;
      if (from < to) to--;
      if (from !== to) moveCard(from, to);
      carouselScroll.querySelectorAll('.carousel-item').forEach((el: Element) => el.classList.remove('drag-over-left', 'drag-over-right'));
    });

    return item;
  }

  function renderCarouselItem(i: number) {
    const old = carouselScroll.querySelector(`[data-index="${i}"]`);
    if (old) old.replaceWith(makeCarouselItem(i));
  }

  function selectCard(i: number) {
    selectedCardIndex = i;
    selectedCards = [i];
    updateCarouselSelection();
    renderCardPreview();
    updateHint();
    carouselScroll.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }

  function updateCarouselSelection() {
    carouselScroll.querySelectorAll('.carousel-item').forEach((el: Element) => {
      const idx = +(el as HTMLElement).dataset.index!;
      el.classList.toggle('selected', selectedCards.includes(idx));
    });
  }

  // ===== Copy / Paste / Cut =====
  function cloneFrame(src: any) {
    if (!src) return null;
    return { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), url: src.url, blob: src.blob, time: src.time, assignment: null, tx: src.tx || 0, ty: src.ty || 0, scale: src.scale || 1 };
  }

  function copyCard() {
    const indices = [...selectedCards].sort((a, b) => a - b);
    clipboardCards = indices.map(i => {
      const card = cards[i];
      if (card.type === 'thumbnail') return { type: 'thumbnail', _image: card.image };
      return { type: 'split', _top: card.top, _bottom: card.bottom };
    });
    toast(`${clipboardCards.length}개 카드 복사됨`, 'success');
  }

  function pasteCard() {
    if (!clipboardCards.length) return toast('복사된 카드가 없습니다.', 'error');
    if (cards.length + clipboardCards.length > MAX_CARDS) return toast(`최대 ${MAX_CARDS}개까지만 가능합니다.`, 'error');
    saveUndo();

    const insertAt = Math.max(...selectedCards) + 1;
    const newCards = clipboardCards.map(cb => {
      if (cb.type === 'thumbnail') {
        const nc = { type: 'thumbnail', image: null as any };
        const f = cloneFrame(cb._image);
        if (f) { nc.image = f; capturedFrames.push(f); }
        return nc;
      } else {
        const nc = { type: 'split', top: null as any, bottom: null as any };
        const ft = cloneFrame(cb._top);
        const fb = cloneFrame(cb._bottom);
        if (ft) { nc.top = ft; capturedFrames.push(ft); }
        if (fb) { nc.bottom = fb; capturedFrames.push(fb); }
        return nc;
      }
    });

    cards.splice(insertAt, 0, ...newCards);
    rebuildAssignments();
    selectedCards = newCards.map((_: any, j: number) => insertAt + j);
    selectedCardIndex = insertAt;
    renderCarousel();
    renderCardPreview();
    toast(`${newCards.length}개 카드 붙여넣기 완료`, 'success');
  }

  function cutCard() {
    const indices = [...selectedCards].sort((a, b) => a - b);
    if (indices.includes(0)) return toast('썸네일은 잘라낼 수 없습니다.', 'error');
    copyCard();
    saveUndo();
    for (let j = indices.length - 1; j >= 0; j--) {
      const i = indices[j];
      const card = cards[i];
      if (card.type === 'split') {
        if (card.top) { card.top.assignment = null; updateFrameBadge(card.top); }
        if (card.bottom) { card.bottom.assignment = null; updateFrameBadge(card.bottom); }
      }
      cards.splice(i, 1);
    }
    rebuildAssignments();
    selectedCardIndex = Math.min(indices[0], cards.length - 1);
    selectedCards = [selectedCardIndex];
    activeTarget = findNextEmptySlot();
    renderCarousel();
    renderCardPreview();
    toast(`${indices.length}개 카드 잘라내기 완료`, 'success');
  }

  function rebuildAssignments() {
    capturedFrames.forEach(f => { if (f.assignment) f.assignment = null; });
    cards.forEach((card, ci) => {
      if (card.type === 'thumbnail' && card.image) card.image.assignment = { cardIndex: ci, slot: 'image' };
      if (card.type === 'split') {
        if (card.top) card.top.assignment = { cardIndex: ci, slot: 'top' };
        if (card.bottom) card.bottom.assignment = { cardIndex: ci, slot: 'bottom' };
      }
    });
    capturedFrames.forEach(f => updateFrameBadge(f));
  }

  // ===== Undo =====
  function makeSnapshot() {
    return {
      selectedCardIndex,
      thumbnailTitle,
      cards: cards.map(c => {
        if (c.type === 'thumbnail') return { type: 'thumbnail', image: c.image };
        return { type: 'split', top: c.top, bottom: c.bottom };
      }),
    };
  }

  function applySnapshot(snapshot: any) {
    cards = snapshot.cards;
    selectedCardIndex = Math.min(snapshot.selectedCardIndex, cards.length - 1);
    thumbnailTitle = snapshot.thumbnailTitle;
    rebuildAssignments();
    activeTarget = findNextEmptySlot();
    renderCarousel();
    renderCardPreview();
  }

  function saveUndo() {
    undoStack.push(makeSnapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    hasUnsavedChanges = true;
  }

  function undo() {
    if (!undoStack.length) return toast('되돌릴 작업이 없습니다.', 'error');
    redoStack.push(makeSnapshot());
    applySnapshot(undoStack.pop());
    toast('되돌리기', 'success');
  }

  function redo() {
    if (!redoStack.length) return toast('다시 실행할 작업이 없습니다.', 'error');
    undoStack.push(makeSnapshot());
    applySnapshot(redoStack.pop());
    toast('다시 실행', 'success');
  }

  // ===== Move Card (drag reorder) =====
  function moveCard(from: number, to: number) {
    saveUndo();
    const [moved] = cards.splice(from, 1);
    cards.splice(to, 0, moved);

    // Re-scan all cards and fix assignments
    capturedFrames.forEach(f => { if (f.assignment) f.assignment = null; });
    cards.forEach((card, ci) => {
      if (card.type === 'thumbnail' && card.image) {
        card.image.assignment = { cardIndex: ci, slot: 'image' };
      } else if (card.type === 'split') {
        if (card.top) card.top.assignment = { cardIndex: ci, slot: 'top' };
        if (card.bottom) card.bottom.assignment = { cardIndex: ci, slot: 'bottom' };
      }
    });
    capturedFrames.forEach(f => updateFrameBadge(f));

    if (selectedCardIndex === from) selectedCardIndex = to;
    else if (from < selectedCardIndex && to >= selectedCardIndex) selectedCardIndex--;
    else if (from > selectedCardIndex && to <= selectedCardIndex) selectedCardIndex++;

    activeTarget = findNextEmptySlot();
    renderCarousel();
    renderCardPreview();
  }

  // ===== Add / Delete Cards =====
  addCardBtn.addEventListener('click', addCard, { signal });

  function addCard() {
    if (cards.length >= MAX_CARDS) return toast(`최대 ${MAX_CARDS}개까지만 추가할 수 있습니다.`, 'error');
    cards.push({ type: 'split', top: null, bottom: null });
    renderCarousel();
    selectCard(cards.length - 1);
    activeTarget = findNextEmptySlot();
    updateHint();
  }

  function deleteCard(index: number) {
    saveUndo();
    if (cards.length <= 1) return toast('최소 1개의 카드가 필요합니다.', 'error');
    if (index === 0) return;

    const card = cards[index];
    if (card.type === 'thumbnail' && card.image) {
      card.image.assignment = null;
      updateFrameBadge(card.image);
    } else if (card.type === 'split') {
      if (card.top) { card.top.assignment = null; updateFrameBadge(card.top); }
      if (card.bottom) { card.bottom.assignment = null; updateFrameBadge(card.bottom); }
    }

    cards.splice(index, 1);

    capturedFrames.forEach(f => {
      if (f.assignment && f.assignment.cardIndex > index) {
        f.assignment.cardIndex--;
        updateFrameBadge(f);
      }
    });

    if (selectedCardIndex >= cards.length) selectedCardIndex = cards.length - 1;
    else if (selectedCardIndex > index) selectedCardIndex--;

    activeTarget = findNextEmptySlot();
    renderCarousel();
    renderCardPreview();
    updateHint();
  }

  // ===== Download =====
  downloadCurrentBtn.addEventListener('click', () => dlCard(selectedCardIndex), { signal });
  downloadAllBtn.addEventListener('click', async () => {
    const has = cards.some((c: any) => c.type === 'thumbnail' ? c.image : (c.top || c.bottom));
    if (!has) return toast('다운로드할 카드가 없습니다.', 'error');
    downloadAllBtn.disabled = true;
    try {
      const zip = new JSZip();
      const folder = zip.folder(videoFileName + '_cardnews')!;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (!(c.type === 'thumbnail' ? c.image : (c.top || c.bottom))) continue;
        const b = await renderCard(i);
        if (b) folder.file(`card_${String(i + 1).padStart(2, '0')}.png`, b);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      dl(URL.createObjectURL(blob), videoFileName + '_cardnews.zip');
      toast('ZIP 다운로드 완료', 'success');
    } catch { toast('ZIP 생성 오류', 'error'); }
    downloadAllBtn.disabled = false;
  }, { signal });

  async function dlCard(i: number) {
    const c = cards[i];
    if (!(c.type === 'thumbnail' ? c.image : (c.top || c.bottom))) return toast('비어있는 카드입니다.', 'error');
    const b = await renderCard(i);
    if (b) { const u = URL.createObjectURL(b); dl(u, `${videoFileName}_card_${String(i + 1).padStart(2, '0')}.png`); URL.revokeObjectURL(u); }
  }

  function renderCard(index: number): Promise<Blob | null> {
    return new Promise(resolve => {
      const card = cards[index];
      const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
      const cx = cv.getContext('2d')!;
      cx.fillStyle = '#000'; cx.fillRect(0, 0, 1080, 1350);

      const drawImg = (fd: any, x: number, y: number, w: number, h: number): Promise<void> => new Promise(r => {
        if (!fd) { r(); return; }
        const img = new Image();
        img.onload = () => {
          const scale = fd.scale || 1;
          const baseRatio = Math.max(w / img.width, h / img.height);
          const dw = img.width * baseRatio * scale;
          const dh = img.height * baseRatio * scale;
          const txRatio = w / 400;
          const dx = x + (w - dw) / 2 + (fd.tx || 0) * txRatio;
          const dy = y + (h - dh) / 2 + (fd.ty || 0) * txRatio;
          cx.save();
          cx.beginPath();
          cx.rect(x, y, w, h);
          cx.clip();
          cx.drawImage(img, dx, dy, dw, dh);
          cx.restore();
          r();
        };
        img.src = fd.url;
      });

      if (card.type === 'thumbnail') {
        drawImg(card.image, 0, 0, 1080, 1350).then(() => {
          if (thumbnailTitle) drawTitle(cx, thumbnailTitle, 1080, 1350);
          cv.toBlob(resolve, 'image/png');
        });
      } else {
        const hh = 1350 / 2;
        Promise.all([drawImg(card.top, 0, 0, 1080, hh), drawImg(card.bottom, 0, hh, 1080, hh)])
          .then(() => cv.toBlob(resolve, 'image/png'));
      }
    });
  }

  function drawTitle(cx: CanvasRenderingContext2D, text: string, w: number, h: number) {
    const lines = text.split('\n'), fs = 120, lh = fs * 1.3;
    cx.save();
    cx.font = `${fs}px "ONE Mobile POP",sans-serif`;
    cx.textAlign = 'center'; cx.textBaseline = 'bottom';
    cx.lineJoin = 'round'; cx.miterLimit = 2;
    const y0 = h - Math.round(w * 0.03);
    for (let i = lines.length - 1; i >= 0; i--) {
      const y = y0 - (lines.length - 1 - i) * lh;
      cx.strokeStyle = '#000'; cx.lineWidth = 52; cx.strokeText(lines[i], w / 2, y);
      cx.fillStyle = '#fff'; cx.fillText(lines[i], w / 2, y);
    }
    cx.restore();
  }

  function dl(url: string, name: string) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  // ===== Helpers =====
  function fmt(s: number) { if (!s || isNaN(s)) return '00:00'; const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }
  function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'); }
  function toast(msg: string, type = 'info') {
    const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
  }

  // ===== Subtitle Remover =====
  function openSubRemover(frameData: any, ci: number, slot: string) {
    subFrameData = frameData;
    subCardIndex = ci;
    subSlot = slot;
    subHistory = [];
    subModal.classList.remove('hidden');

    subImg = new Image();
    subImg.onload = () => {
      subCanvas.width = subImg.width;
      subCanvas.height = subImg.height;
      subMaskCanvas.width = subImg.width;
      subMaskCanvas.height = subImg.height;
      subCtx = subCanvas.getContext('2d')!;
      subMaskCtx = subMaskCanvas.getContext('2d')!;
      subCtx.drawImage(subImg, 0, 0);
      subMaskCtx.clearRect(0, 0, subMaskCanvas.width, subMaskCanvas.height);
      subHistory = [subCtx.getImageData(0, 0, subCanvas.width, subCanvas.height)];
    };
    subImg.src = frameData.url;
  }

  function subPos(e: MouseEvent) {
    const rect = subCanvasWrap.getBoundingClientRect();
    const scaleX = subCanvas.width / rect.width;
    const scaleY = subCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  subCanvasWrap.addEventListener('mousedown', (e: MouseEvent) => {
    if (subModal.classList.contains('hidden')) return;
    subPainting = true;
    subHistory.push(subCtx.getImageData(0, 0, subCanvas.width, subCanvas.height));
    paintSub(e);
  }, { signal });

  const onSubMouseMove = (e: MouseEvent) => {
    if (!subPainting) return;
    paintSub(e);
  };
  document.addEventListener('mousemove', onSubMouseMove, { signal });

  const onSubMouseUp = () => {
    if (!subPainting) return;
    subPainting = false;
    inpaintMasked();
    subMaskCtx.clearRect(0, 0, subMaskCanvas.width, subMaskCanvas.height);
  };
  document.addEventListener('mouseup', onSubMouseUp, { signal });

  function paintSub(e: MouseEvent) {
    const pos = subPos(e);
    const brush = parseInt(subBrushSize.value) * (subCanvas.width / subCanvasWrap.getBoundingClientRect().width);

    subMaskCtx.fillStyle = 'rgba(231, 76, 60, 0.6)';
    subMaskCtx.beginPath();
    subMaskCtx.arc(pos.x, pos.y, brush / 2, 0, Math.PI * 2);
    subMaskCtx.fill();

    if (!(subCanvas as any)._mask) {
      (subCanvas as any)._mask = new Uint8Array(subCanvas.width * subCanvas.height);
    }
    const r = Math.ceil(brush / 2);
    const cx = Math.round(pos.x), cy = Math.round(pos.y);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const px = cx + dx, py = cy + dy;
          if (px >= 0 && px < subCanvas.width && py >= 0 && py < subCanvas.height) {
            (subCanvas as any)._mask[py * subCanvas.width + px] = 1;
          }
        }
      }
    }
  }

  function inpaintMasked() {
    const w = subCanvas.width, h = subCanvas.height;
    const mask = (subCanvas as any)._mask;
    if (!mask) return;

    const orig = subCtx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(orig.data);
    const filled = new Uint8Array(mask);
    const result = new Uint8ClampedArray(src);

    const HP = 5;
    const SEARCH = 100;
    const SAMPLES = 80;
    const FEATHER = 6;

    // Edge distance for feathering
    const edgeDist = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!filled[y * w + x]) continue;
        let md = FEATHER + 1;
        outer: for (let r = 1; r <= FEATHER; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && !mask[ny * w + nx]) {
                md = Math.sqrt(dx * dx + dy * dy); break outer;
              }
            }
          }
        }
        edgeDist[y * w + x] = Math.min(md / FEATHER, 1);
      }
    }

    // Onion-peel fill with patch matching + neighbor propagation
    let prevBestMap = new Map();

    let layersLeft = true;
    while (layersLeft) {
      layersLeft = false;
      const boundary: number[] = [];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!filled[y * w + x]) continue;
          let isBnd = false;
          for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = x + ddx, ny = y + ddy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h || !filled[ny * w + nx]) { isBnd = true; break; }
          }
          if (isBnd) boundary.push(x | (y << 16));
          else layersLeft = true;
        }
      }
      if (!boundary.length) break;

      const newBestMap = new Map();

      for (const packed of boundary) {
        const bx = packed & 0xFFFF, by = packed >> 16;
        let bestDist = Infinity, bestSx = bx, bestSy = by;

        // Propagation: try neighbors' best matches (shifted by 1)
        for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nk = (bx + ddx) | ((by + ddy) << 16);
          const prev = prevBestMap.get(nk);
          if (prev) {
            const sx = prev[0] - ddx, sy = prev[1] - ddy;
            if (sx >= HP && sx < w - HP && sy >= HP && sy < h - HP && !mask[sy * w + sx]) {
              let dist = 0, cnt = 0;
              for (let py = -HP; py <= HP; py += 2) {
                for (let px = -HP; px <= HP; px += 2) {
                  const tx = bx + px, ty = by + py;
                  if (tx < 0 || tx >= w || ty < 0 || ty >= h || filled[ty * w + tx]) continue;
                  const ti = (ty * w + tx) * 4, si = ((sy + py) * w + (sx + px)) * 4;
                  const dr = result[ti] - src[si], dg = result[ti + 1] - src[si + 1], db = result[ti + 2] - src[si + 2];
                  dist += dr * dr + dg * dg + db * db; cnt++;
                }
              }
              if (cnt > 2) { dist /= cnt; if (dist < bestDist) { bestDist = dist; bestSx = sx; bestSy = sy; } }
            }
          }
        }

        // Random search
        for (let s = 0; s < SAMPLES; s++) {
          const sx = bx + Math.floor(Math.random() * SEARCH * 2 - SEARCH);
          const sy = by + Math.floor(Math.random() * SEARCH * 2 - SEARCH);
          if (sx < HP || sx >= w - HP || sy < HP || sy >= h - HP || mask[sy * w + sx]) continue;
          let dist = 0, cnt = 0;
          for (let py = -HP; py <= HP; py += 2) {
            for (let px = -HP; px <= HP; px += 2) {
              const tx = bx + px, ty = by + py;
              if (tx < 0 || tx >= w || ty < 0 || ty >= h || filled[ty * w + tx]) continue;
              const ti = (ty * w + tx) * 4, si = ((sy + py) * w + (sx + px)) * 4;
              const dr = result[ti] - src[si], dg = result[ti + 1] - src[si + 1], db = result[ti + 2] - src[si + 2];
              dist += dr * dr + dg * dg + db * db; cnt++;
            }
          }
          if (cnt < 3) continue;
          dist /= cnt;
          if (dist < bestDist) { bestDist = dist; bestSx = sx; bestSy = sy; }
        }

        const si = (bestSy * w + bestSx) * 4, di = (by * w + bx) * 4;
        result[di] = src[si]; result[di + 1] = src[si + 1]; result[di + 2] = src[si + 2]; result[di + 3] = 255;
        filled[by * w + bx] = 0;
        newBestMap.set(packed, [bestSx, bestSy]);
      }
      prevBestMap = newBestMap;
    }

    // Light smoothing (3x3 weighted, 2 passes)
    for (let pass = 0; pass < 2; pass++) {
      const tmp = new Uint8ClampedArray(result);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!mask[y * w + x]) continue;
          for (let c = 0; c < 3; c++) {
            const i = (y * w + x) * 4 + c;
            tmp[i] = (
              result[i] * 4 +
              result[((y - 1) * w + x) * 4 + c] * 2 + result[((y + 1) * w + x) * 4 + c] * 2 +
              result[(y * w + x - 1) * 4 + c] * 2 + result[(y * w + x + 1) * 4 + c] * 2 +
              result[((y - 1) * w + x - 1) * 4 + c] + result[((y - 1) * w + x + 1) * 4 + c] +
              result[((y + 1) * w + x - 1) * 4 + c] + result[((y + 1) * w + x + 1) * 4 + c]
            ) / 16;
          }
        }
      }
      result.set(tmp);
    }

    // Feather edges
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const a = edgeDist[y * w + x];
        const i = (y * w + x) * 4;
        result[i] = src[i] * (1 - a) + result[i] * a;
        result[i + 1] = src[i + 1] * (1 - a) + result[i + 1] * a;
        result[i + 2] = src[i + 2] * (1 - a) + result[i + 2] * a;
      }
    }

    subCtx.putImageData(new ImageData(result, w, h), 0, 0);
    (subCanvas as any)._mask = new Uint8Array(w * h);
  }

  subUndoBtn.addEventListener('click', () => {
    if (subHistory.length <= 1) return;
    subHistory.pop();
    subCtx.putImageData(subHistory[subHistory.length - 1], 0, 0);
    (subCanvas as any)._mask = new Uint8Array(subCanvas.width * subCanvas.height);
    subMaskCtx.clearRect(0, 0, subMaskCanvas.width, subMaskCanvas.height);
  }, { signal });

  subApplyBtn.addEventListener('click', () => {
    saveUndo();
    subCanvas.toBlob((blob: Blob | null) => {
      if (!blob) return;
      const newUrl = URL.createObjectURL(blob);
      if (subFrameData.url) URL.revokeObjectURL(subFrameData.url);
      subFrameData.url = newUrl;
      subFrameData.blob = blob;
      subFrameData._dirty = true;

      subModal.classList.add('hidden');
      (subCanvas as any)._mask = null;
      renderCardPreview();
      renderCarouselItem(subCardIndex);
      const stripEl = framesScroll.querySelector(`[data-id="${subFrameData.id}"]`);
      if (stripEl) { const img = stripEl.querySelector('img') as HTMLImageElement; if (img) img.src = newUrl; }
      toast('자막이 제거되었습니다.', 'success');
    }, 'image/png');
  }, { signal });

  subCancelBtn.addEventListener('click', () => {
    subModal.classList.add('hidden');
    (subCanvas as any)._mask = null;
  }, { signal });

  // ===== Cloud Project System (API-based) =====
  async function blobToBase64(blob: Blob, maxSize?: number): Promise<string> {
    maxSize = maxSize || 1200;
    const img = new Image();
    const url = URL.createObjectURL(blob);
    await new Promise<void>((r, e) => { img.onload = () => r(); img.onerror = e; img.src = url; });
    URL.revokeObjectURL(url);
    const cv = document.createElement('canvas');
    let w = img.width, h = img.height;
    if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w = Math.round(w * r); h = Math.round(h * r); }
    cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const jpegBlob = await new Promise<Blob>(r => cv.toBlob((b) => r(b!), 'image/jpeg', 0.7));
    return new Promise<string>(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(jpegBlob); });
  }

  function base64ToBlobUrl(base64: string): string {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)![1];
    const bstr = atob(parts[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: mime }));
  }

  async function saveVideoToCloud(projectId: string) {
    if (!currentVideoBlob || videoSavedForProject) return;
    let lastPct = -1;
    const { fileKey } = await apiUploadVideo(projectId, currentVideoBlob, (pct) => {
      if (pct !== lastPct && pct % 10 === 0) {
        lastPct = pct;
        let el = container.querySelector('#uploadToast') as HTMLElement;
        if (!el) { el = document.createElement('div'); el.id = 'uploadToast'; el.className = 'toast'; toastContainer.appendChild(el); }
        el.textContent = `영상 업로드 중... ${pct}%`;
      }
    });
    const el = container.querySelector('#uploadToast');
    if (el) el.remove();
    await apiUpdateProject(projectId, { videoKey: fileKey, videoName: videoFileName });
    videoSavedForProject = true;
    toast('영상 업로드 완료', 'success');
  }

  async function loadVideoFromCloud(projectId: string): Promise<{ url: string; name: string } | null> {
    const project = await apiGetProject(projectId);
    if (!project) return null;
    // If videoKey exists, get presigned URL from the video endpoint
    if (project.video_key || project.videoKey) {
      const url = await apiGetVideoUrl(projectId);
      if (url) return { url, name: project.video_name || project.videoName || 'video' };
    }
    return null;
  }

  async function saveFrameToCloud(f: any, projectId: string): Promise<any | null> {
    const frameId = f.cloudFrameId || f.id || Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    if (f.cloudFrameId && !f._dirty) {
      return { frameId, time: f.time, tx: f.tx || 0, ty: f.ty || 0, scale: f.scale || 1 };
    }
    let blob = f.blob;
    if (!blob && f.url) { try { blob = await (await fetch(f.url)).blob(); } catch { return null; } }
    if (!blob) return null;
    const base64 = await blobToBase64(blob, 1200);
    await apiSaveFrames(projectId, frameId, base64);
    f.cloudFrameId = frameId;
    f._dirty = false;
    return { frameId, time: f.time, tx: f.tx || 0, ty: f.ty || 0, scale: f.scale || 1 };
  }

  // Save current project
  async function saveProject() {
    if (!currentProjectId) {
      const name = prompt('프로젝트 이름을 입력하세요:', currentProjectName || videoFileName || '새 프로젝트');
      if (!name) return;
      try {
        const projectData = await apiCreateProject({
          name,
          thumbnailTitle: '',
          cards: [{ type: 'thumbnail', image: null }],
          thumbData: null,
          cardCount: MAX_CARDS,
        });
        currentProjectId = projectData.id;
        currentProjectName = name;
      } catch (err) {
        toast('프로젝트 생성에 실패했습니다.', 'error');
        console.error(err);
        return;
      }
    }
    try {
      toast('저장 중...', 'info');
      const serializedCards: any[] = [];
      for (const card of cards) {
        if (card.type === 'thumbnail') {
          serializedCards.push({ type: 'thumbnail', image: card.image ? await saveFrameToCloud(card.image, currentProjectId!) : null });
        } else {
          serializedCards.push({ type: 'split', top: card.top ? await saveFrameToCloud(card.top, currentProjectId!) : null, bottom: card.bottom ? await saveFrameToCloud(card.bottom, currentProjectId!) : null });
        }
      }
      let thumbData: string | null = null;
      if (cards[0]?.image) {
        try {
          const cardBlob = await renderCard(0);
          if (cardBlob) thumbData = await blobToBase64(cardBlob, 400);
        } catch {}
      }
      await apiUpdateProject(currentProjectId!, {
        name: currentProjectName,
        thumbnailTitle,
        cards: serializedCards,
        thumbData,
        cardCount: cards.length,
      });
      hasUnsavedChanges = false;
      toast('프로젝트가 저장되었습니다.', 'success');
      // Upload video in background if needed
      if (currentVideoBlob && !videoSavedForProject) {
        const pid = currentProjectId!;
        saveVideoToCloud(pid).catch(vErr => {
          console.error('Video save error:', vErr);
          toast('영상 업로드에 실패했습니다.', 'error');
        });
      }
    } catch (err) {
      toast('저장 중 오류가 발생했습니다.', 'error');
      console.error(err);
    }
  }

  // Load project
  async function loadProject(id: string) {
    try {
      const project = await apiGetProject(id);
      if (!project) return toast('프로젝트를 찾을 수 없습니다.', 'error');

      // Reset video & extraction state for new project
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
      currentVideoBlob = null;
      isExtracting = false;
      cancelExtraction = false;
      extractBtn.disabled = false;
      progressContainer.classList.add('hidden');
      videoSavedForProject = false;
      videoFileName = '';
      setVideoVisible(false);
      const reselectEl = container.querySelector('.video-reselect');
      if (reselectEl) reselectEl.remove();

      // The frame data comes as part of the project JSON (stored in frames JSONB column)
      const frameMap: Record<string, string> = {};
      if (project.frames) {
        // frames is a map of frameId -> base64 data
        for (const [fId, fData] of Object.entries(project.frames as Record<string, any>)) {
          frameMap[fId] = typeof fData === 'string' ? fData : fData.data;
        }
      }

      currentProjectId = project.id;
      currentProjectName = project.name;
      thumbnailTitle = project.thumbnailTitle || project.thumbnail_title || '';
      cards = [];
      capturedFrames = [];
      const projectCards = project.cards || [];
      projectCards.forEach((sc: any, ci: number) => {
        if (sc.type === 'thumbnail') {
          cards.push({ type: 'thumbnail', image: sc.image ? loadCloudFrame(sc.image, ci, 'image', frameMap) : null });
        } else {
          cards.push({ type: 'split', top: sc.top ? loadCloudFrame(sc.top, ci, 'top', frameMap) : null, bottom: sc.bottom ? loadCloudFrame(sc.bottom, ci, 'bottom', frameMap) : null });
        }
      });

      selectedCardIndex = 0; selectedCards = [0];
      activeTarget = findNextEmptySlot();
      undoStack = []; redoStack = [];

      showEditor(true);
      setVideoVisible(false);
      renderCarousel(); renderCardPreview();

      framesScroll.querySelectorAll('.frame-thumb-item').forEach(el => el.remove());
      framesEmpty.style.display = capturedFrames.length ? 'none' : '';
      capturedFrames.forEach(f => addFrameToStrip(f));
      stripCount.textContent = String(capturedFrames.length);

      // Load video from cloud
      try {
        const vd = await loadVideoFromCloud(id);
        if (vd) {
          videoFileName = vd.name;
          videoSavedForProject = true;
          videoPlayer.onloadedmetadata = () => {
            timeline.max = String(videoPlayer.duration);
            updateTime(); updateInfo(); detectFPS();
          };
          videoPlayer.onerror = () => toast('영상을 불러올 수 없습니다.', 'error');
          videoPlayer.crossOrigin = 'anonymous';
          videoPlayer.preload = 'auto';
          videoPlayer.src = vd.url;
          videoPlayer.load();
        }
      } catch (e) { console.error('Video load:', e); }

      toast(`"${project.name}" 프로젝트를 불러왔습니다.`, 'success');
    } catch (err) {
      toast('불러오기 중 오류가 발생했습니다.', 'error');
      console.error(err);
    }
  }

  function loadCloudFrame(sf: any, ci: number, slot: string, frameMap: Record<string, string>) {
    const base64 = frameMap[sf.frameId];
    if (!base64) return null;
    const url = base64ToBlobUrl(base64);
    const frame = {
      id: sf.frameId, cloudFrameId: sf.frameId, _dirty: false,
      url, blob: null, time: sf.time,
      assignment: { cardIndex: ci, slot },
      tx: sf.tx || 0, ty: sf.ty || 0, scale: sf.scale || 1,
    };
    capturedFrames.push(frame);
    return frame;
  }

  // ===== Screen Navigation =====
  function showHome(push?: boolean) {
    homeScreen.classList.remove('hidden');
    uploadScreen.classList.add('hidden');
    editorScreen.classList.add('hidden');
    headerActions.classList.add('hidden');
    if (push !== false) history.pushState({ screen: 'home' }, '', '#home');
    renderProjectList();
  }

  function showEditor(push?: boolean) {
    homeScreen.classList.add('hidden');
    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    headerActions.classList.remove('hidden');
    if (push !== false) history.pushState({ screen: 'editor', projectId: currentProjectId }, '', `#project/${currentProjectId}`);
  }

  const handlePopState = async (e: PopStateEvent) => {
    const target = e.state?.screen || 'home';

    if (!editorScreen.classList.contains('hidden') && target !== 'editor' && hasUnsavedChanges) {
      const action = await showConfirmModal();
      if (action === 'save') { await saveProject(); showHome(false); }
      else if (action === 'discard') { hasUnsavedChanges = false; showHome(false); }
      else { history.pushState({ screen: 'editor', projectId: currentProjectId }, '', `#project/${currentProjectId}`); }
      return;
    }

    if (target === 'editor' && e.state?.projectId) {
      if (currentProjectId === e.state.projectId) {
        showEditor(false);
      } else {
        await loadProject(e.state.projectId);
      }
    } else {
      showHome(false);
    }
  };
  window.addEventListener('popstate', handlePopState, { signal });

  async function renderProjectList() {
    const projects = await apiGetProjects();
    projectList.innerHTML = '';
    if (!projects.length) {
      projectList.appendChild(projectEmpty);
      return;
    }
    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';

      const thumb = document.createElement('div');
      thumb.className = 'project-thumb';
      if (p.thumbData || p.thumb_data) {
        const img = document.createElement('img');
        img.src = p.thumbData || p.thumb_data;
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = '<span class="project-thumb-empty">빈</span>';
      }

      const info = document.createElement('div');
      info.className = 'project-info';
      const updatedAt = p.updatedAt || p.updated_at;
      info.innerHTML = `<div class="project-name">${esc(p.name)}</div>
        <div class="project-meta">${p.cardCount || p.card_count || 0}장 · ${new Date(updatedAt).toLocaleDateString('ko-KR')} ${new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>`;

      const del = document.createElement('button');
      del.className = 'project-delete';
      del.title = '삭제';
      del.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      del.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        if (!confirm(`"${p.name}" 프로젝트를 삭제하시겠습니까?`)) return;
        await apiDeleteProject(p.id);
        renderProjectList();
        toast('프로젝트가 삭제되었습니다.', 'success');
      });

      card.appendChild(del);
      card.appendChild(thumb);
      card.appendChild(info);
      card.addEventListener('click', () => loadProject(p.id));
      projectList.appendChild(card);
    });
  }

  // New project -> go to upload screen
  newProjectBtn.addEventListener('click', () => {
    currentProjectId = null;
    currentProjectName = '';
    thumbnailTitle = '';
    capturedFrames = [];
    undoStack = [];
    redoStack = [];
    hasUnsavedChanges = false;
    initCards();
    homeScreen.classList.add('hidden');
    uploadScreen.classList.remove('hidden');
    history.pushState({ screen: 'upload' }, '', '#new');
  }, { signal });

  // Save button
  saveProjectBtn.addEventListener('click', saveProject, { signal });

  // Confirm modal for unsaved changes
  function showConfirmModal(): Promise<string> {
    return new Promise(resolve => {
      const modal = $('confirmModal');
      modal.classList.remove('hidden');
      $('confirmCancel').onclick = () => { modal.classList.add('hidden'); resolve('cancel'); };
      $('confirmDiscard').onclick = () => { modal.classList.add('hidden'); resolve('discard'); };
      $('confirmSave').onclick = () => { modal.classList.add('hidden'); resolve('save'); };
    });
  }

  async function goHome() {
    if (!editorScreen.classList.contains('hidden') && hasUnsavedChanges) {
      const action = await showConfirmModal();
      if (action === 'save') { await saveProject(); showHome(); }
      else if (action === 'discard') { hasUnsavedChanges = false; showHome(); }
    } else {
      showHome();
    }
  }

  // Home button
  homeBtn.addEventListener('click', goHome, { signal });

  // Back button -> navigate home via callback
  backBtn.addEventListener('click', async () => {
    if (!editorScreen.classList.contains('hidden') && hasUnsavedChanges) {
      const action = await showConfirmModal();
      if (action === 'save') { await saveProject(); onNavigateHome(); }
      else if (action === 'discard') { hasUnsavedChanges = false; onNavigateHome(); }
      // cancel: do nothing
    } else if (!homeScreen.classList.contains('hidden')) {
      onNavigateHome();
    } else {
      goHome();
    }
  }, { signal });

  // ===== Initialize =====
  // Reset state and show home screen
  capturedFrames = [];
  undoStack = [];
  redoStack = [];
  currentProjectId = null;
  currentProjectName = '';
  thumbnailTitle = '';
  initCards();
  showHome();

  // ===== Cleanup / Destroy =====
  function destroy() {
    abortController.abort();
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
    if (allCardsObserver) { allCardsObserver.disconnect(); allCardsObserver = null; }
    // Revoke all blob URLs
    capturedFrames.forEach(f => { if (f.url) try { URL.revokeObjectURL(f.url); } catch {} });
    // Stop video
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    // Clear container
    container.innerHTML = '';
  }

  return { destroy };
}
