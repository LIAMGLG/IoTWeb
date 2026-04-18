import { computed, reactive, ref } from "vue";

export function useEventStore() {
  const events = ref([]);
  const lastSeen = reactive({});

  function addEvent(evt) {
    // Set default state to false (待处理)
    const eventWithState = { ...evt, state: evt.state ?? false };
    events.value = [eventWithState, ...events.value].slice(0, 300);
    lastSeen[eventWithState.deviceId] = Date.now();
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

  return { events, addEvent, onlineDevices, todayAlarms, latest, toggleState };
}

