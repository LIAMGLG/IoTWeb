import { computed, reactive, ref } from "vue";

export function useEventStore() {
  const events = ref([]);
  const lastSeen = reactive({});

  function normalizeEvent(evt) {
    return { ...evt, state: evt.state ?? false };
  }

  function addEvent(evt) {
    const eventWithState = normalizeEvent(evt);
    events.value = [eventWithState, ...events.value].slice(0, 300);
    lastSeen[eventWithState.deviceId] = Date.now();
  }

  function replaceEvents(list) {
    events.value = (Array.isArray(list) ? list : []).map(normalizeEvent).slice(0, 300);
    Object.keys(lastSeen).forEach((key) => {
      delete lastSeen[key];
    });
    events.value.forEach((evt) => {
      if (evt?.deviceId) lastSeen[evt.deviceId] = Date.now();
    });
  }

  function toggleState(eventId) {
    const event = events.value.find(e => e.id === eventId);
    if (event) {
      event.state = !event.state;
    }
  }

  const onlineDevices = computed(() => {
    const now = Date.now();
    return Object.entries(lastSeen).filter(([, ts]) => now - ts < 5 * 60 * 1000).map(([id]) => id);
  });

  const todayAlarms = computed(() => {
    const today = new Date().toDateString();
    return events.value.filter((e) => new Date(e.receivedAt).toDateString() === today && (e.level === "alarm" || e.level === "warn")).length;
  });

  const latest = computed(() => events.value[0] ?? null);

  return { events, addEvent, replaceEvents, onlineDevices, todayAlarms, latest, toggleState };
}
