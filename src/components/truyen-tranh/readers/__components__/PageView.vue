<template>
  <img v-show="loaded" v-bind="attrs" :src="srcImage" @load="onLoad" />
  <div
    v-if="!loaded"
    class="text-center w-100% aspect-ratio-2 flex items-center justify-center"
  >
    <slot name="loading" />
  </div>
  <div
    v-else-if="error"
    class="w-550px max-w-100% aspect-ratio-2 flex items-center justify-center"
  >
    <p>
      Đã xảy ra lỗi khi tải hình ảnh (Code: {{ error + "" || -1 }}) (Try again
      in 3s)
    </p>

    <q-btn
      outline
      color="main-3"
      class="mt-2"
      @click="startLoad(src)"
      label="Thử lại"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  inheritAttrs: true,
})

const props = defineProps<{
  src: string
}>()
const attrs = useAttrs()

const loaded = ref(false)
const error = ref<unknown>()
const srcImage = ref<string | undefined>()
// Free memory
watch(srcImage, (n, o) => {
  if (o?.startsWith("blob:")) URL.revokeObjectURL(o)
})
function onLoad(event: Event) {
  const { src } = event.target as HTMLImageElement
  if (src.startsWith("blob:")) URL.revokeObjectURL(src)
}

async function startLoad(src: string) {
  loaded.value = false
  error.value = null

  try {
    const response = await fetchRetry(src, {
      retries: 5,
      retryDelay: 300,
    })

    // eslint-disable-next-line functional/no-throw-statement
    if (!response.ok) throw new Error("die")

    srcImage.value = URL.createObjectURL(
      new Blob([await response.arrayBuffer()])
    )
  } catch (err) {
    error.value = err

    await sleep(3_000)
    // eslint-disable-next-line no-void
    void startLoad(src)
  } finally {
    loaded.value = true
  }
}

// try use ajax
watch(() => props.src, startLoad, { immediate: true })
</script>
