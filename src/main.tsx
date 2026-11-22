import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { getLessonById } from './data';
import { lessonIdFromUrl, showLessonInUrl } from './lib/lessonUrl';
import { decodeProgress, takeProgressFromUrl, type IncomingProgress } from './lib/progressLink';
import { mountPythonHighlighting } from './lib/pythonHighlighting';
import { loadActiveLessonId, loadTheme, saveActiveLessonId } from './lib/storage';

// Read before anything else rewrites the URL; the payload is stripped so a reload doesn't ask again.
const progressData = takeProgressFromUrl();

// iOS Safari zooms in when focusing text under 16px, like the code editor. maximum-scale stops
// that there while still allowing pinch zoom (Android would block pinch zoom, so it's iOS only).
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
}

const initialTheme = loadTheme();
document.documentElement.classList.toggle('dark', initialTheme === 'dark');
mountPythonHighlighting(document);

// A lesson link in the URL wins over the lesson last opened on this device.
const urlLessonId = lessonIdFromUrl();
const initialLessonId = urlLessonId ?? getLessonById(loadActiveLessonId() ?? '').id;
saveActiveLessonId(initialLessonId);
showLessonInUrl(initialLessonId);

function render(incomingProgress: IncomingProgress | null) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        initialTheme={initialTheme}
        initialLessonId={initialLessonId}
        enteredViaLessonUrl={urlLessonId !== null}
        incomingProgress={incomingProgress}
      />
    </StrictMode>
  );
}

if (progressData === null) render(null);
else void decodeProgress(progressData).then(render);
