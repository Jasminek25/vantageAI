let enginePromise;

const SYSTEM_PROMPT = `You are Heirline's educational inheritance coach. Explain general inheritance and personal-finance concepts in plain language. Do not provide individualized legal, tax, or investment advice. Never invent document terms, deadlines, tax outcomes, or account values. Recommend the appropriate qualified professional when a decision depends on personal circumstances. Keep answers under 180 words and finish with two useful questions the user can ask a professional.`;

export function supportsLocalAI() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export async function initializeLocalCoach(onProgress = () => {}) {
  if (!supportsLocalAI()) throw new Error('This browser does not support WebGPU.');
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm').then(async webllm => {
      const models = webllm.prebuiltAppConfig?.model_list || [];
      const preferred = models.find(model => /qwen.*0\.5b.*instruct/i.test(model.model_id))
        || models.find(model => /(0\.5b|1b).*instruct/i.test(model.model_id));
      if (!preferred) throw new Error('No compact local model is available in this build.');
      return webllm.CreateMLCEngine(preferred.model_id, {
        initProgressCallback: progress => onProgress(progress.text || 'Preparing local AI…')
      });
    }).catch(error => {
      enginePromise = undefined;
      throw error;
    });
  }
  return enginePromise;
}

export async function askLocalCoach(question) {
  if (!enginePromise) throw new Error('Local AI has not been enabled.');
  const engine = await enginePromise;
  const result = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ],
    temperature: 0.2,
    max_tokens: 300
  });
  return {
    text: result.choices?.[0]?.message?.content?.trim() || 'I could not prepare a response. Please try a suggested question.',
    mode: 'local open-source AI'
  };
}
