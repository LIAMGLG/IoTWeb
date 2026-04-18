import { ref, watch } from "vue";

const STORAGE_KEY = "insulator-web-vue:v1";

export function useConfig() {
  const brokerUrl = ref("ws://localhost:8080");
  const clientId = ref(`web_${Math.random().toString(16).slice(2, 8)}`);
  const topic = ref("#");
  const imgTopic = ref("");
  const username = ref("");
  const password = ref("");
  const qos = ref(0);

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (typeof v?.brokerUrl === "string") brokerUrl.value = v.brokerUrl;
      if (typeof v?.clientId === "string") clientId.value = v.clientId;
      if (typeof v?.topic === "string") topic.value = v.topic;
      if (typeof v?.imgTopic === "string") imgTopic.value = v.imgTopic;
      if (typeof v?.username === "string") username.value = v.username;
      if (typeof v?.password === "string") password.value = v.password;
      if (typeof v?.qos === "number") qos.value = v.qos;
    } catch {}
  }

  function save() {
    const v = {
      brokerUrl: brokerUrl.value.trim(),
      clientId: clientId.value.trim(),
      topic: topic.value.trim(),
      imgTopic: imgTopic.value.trim(),
      username: username.value,
      password: password.value,
      qos: Number(qos.value || 0),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  }

  watch([brokerUrl, clientId, topic, imgTopic, username, password, qos], save, { deep: false });

  load();

  return { brokerUrl, clientId, topic, imgTopic, username, password, qos, load, save };
}

