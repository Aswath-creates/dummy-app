const STORAGE_KEY = "form-workout-log";

const form = document.querySelector("#workout-form");
const dateInput = document.querySelector("#workout-date");
const list = document.querySelector("#workout-list");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#form-message");

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadWorkouts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  const workouts = JSON.parse(saved);
  if (!Array.isArray(workouts)) {
    throw new Error("Saved workout data is not a list.");
  }
  return workouts.filter((workout) =>
    workout &&
    typeof workout.id === "string" &&
    typeof workout.exercise === "string" &&
    Number.isFinite(workout.sets) &&
    Number.isFinite(workout.reps) &&
    Number.isFinite(workout.weight) &&
    typeof workout.date === "string"
  );
}

let workouts;
try {
  workouts = loadWorkouts();
} catch (error) {
  console.error("Could not load the saved workout log.", error);
  workouts = [];
  message.textContent = "Your saved workouts could not be loaded. Check browser storage and refresh.";
}

dateInput.value = localDateString();
document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date()).toUpperCase();

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getVolume(workout) {
  return workout.sets * workout.reps * workout.weight;
}

function getWeekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

function updateStats() {
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const activeDays = new Set(
    workouts
      .map((workout) => {
        const [year, month, day] = workout.date.split("-").map(Number);
        return new Date(year, month - 1, day);
      })
      .filter((date) => date >= weekStart && date < weekEnd)
      .map(localDateString)
  );
  const totalVolume = workouts.reduce((sum, workout) => sum + getVolume(workout), 0);

  document.querySelector("#weekly-workouts").textContent = activeDays.size;
  document.querySelector("#total-volume").textContent = Math.round(totalVolume).toLocaleString();
  document.querySelector("#total-movements").textContent = workouts.length;
  document.querySelector("#entry-count").textContent = workouts.length;
}

function renderWorkouts() {
  list.replaceChildren();
  emptyState.hidden = workouts.length > 0;

  const sortedWorkouts = [...workouts].sort((first, second) =>
    second.date.localeCompare(first.date) || second.id.localeCompare(first.id)
  );

  for (const workout of sortedWorkouts) {
    const entry = document.createElement("article");
    entry.className = "workout-entry";

    const icon = document.createElement("div");
    icon.className = "entry-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "↗";

    const copy = document.createElement("div");
    copy.className = "entry-copy";

    const title = document.createElement("div");
    title.className = "entry-title";
    title.textContent = workout.exercise;

    const detail = document.createElement("div");
    detail.className = "entry-detail";
    detail.textContent = `${workout.sets} sets × ${workout.reps} reps${workout.weight > 0 ? ` × ${workout.weight} kg` : " · Bodyweight"}`;

    const date = document.createElement("div");
    date.className = "entry-date";
    date.textContent = formatDate(workout.date);
    copy.append(title, detail, date);

    const volume = document.createElement("div");
    volume.className = "entry-volume";
    const amount = document.createElement("strong");
    amount.textContent = `${Math.round(getVolume(workout)).toLocaleString()} kg`;
    const volumeLabel = document.createElement("span");
    volumeLabel.textContent = "total volume";
    volume.append(amount, volumeLabel);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-entry";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${workout.exercise}`);
    deleteButton.title = "Delete workout";
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", () => deleteWorkout(workout.id));

    entry.append(icon, copy, volume, deleteButton);
    list.append(entry);
  }
  updateStats();
}

function saveWorkouts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
    return true;
  } catch (error) {
    console.error("Could not save the workout log.", error);
    message.textContent = "Could not save your workout. Browser storage may be unavailable or full.";
    return false;
  }
}

function deleteWorkout(id) {
  const previousWorkouts = workouts;
  workouts = workouts.filter((workout) => workout.id !== id);
  if (!saveWorkouts()) {
    workouts = previousWorkouts;
    return;
  }
  message.textContent = "Workout removed from your log.";
  renderWorkouts();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";

  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const workout = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    exercise: String(data.get("exercise")).trim(),
    sets: Number(data.get("sets")),
    reps: Number(data.get("reps")),
    weight: Number(data.get("weight") || 0),
    date: String(data.get("date")),
  };

  if (!workout.exercise || !Number.isInteger(workout.sets) || !Number.isInteger(workout.reps) ||
      workout.sets < 1 || workout.reps < 1 || workout.weight < 0 || !workout.date) {
    message.textContent = "Enter a movement and valid set, rep, and date details.";
    return;
  }

  workouts.push(workout);
  if (!saveWorkouts()) {
    workouts.pop();
    return;
  }

  form.reset();
  dateInput.value = localDateString();
  message.textContent = `${workout.exercise} added to your log.`;
  renderWorkouts();
});

renderWorkouts();
