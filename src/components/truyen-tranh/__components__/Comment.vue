<template>
  <div class="flex flex-nowrap">
    <div>
      <Avatar
        size="40"
        :srcs="
          [
            comment.author.avatar,
            `https://ui-avatars.com/api/?name=${comment.author.name}`,
          ].filter((item) => item !== NO_AVATAR)
        "
      />
    </div>
    <div class="w-full min-w-0">
      <div class="ml-3 min-w-0 bg-[rgba(50,50,50,0.5)] py-1 px-3 rounded-xl">
        <h5 class="text-17px font-regular leading-normal truncate w-100%">
          {{ comment.author.name }}
        </h5>
        <div class="flex flex-nowrap text-13px items-center text-gray-200">
          <h6 class="leading-normal">
            Cấp {{ comment.author.level.current }} -
            {{ comment.author.level.perNext }}%
          </h6>

          <template v-if="comment.chapter_name">
            <q-separator vertical class="mx-2" />

            <small class="text-13px">Chương {{ comment.chapter_name }}</small>
          </template>
        </div>

        <p v-html="comment.content" class="leading-normal pt-2 font-16px" />
      </div>

      <div
        class="text-gray-300 text-weight-medium px-5 mt-1 text-13px flex items-center"
      >
        <span class="flex items-center mr-4 cursor-pointer">
          <Icon
            icon="fluent:thumb-like-28-filled"
            width="1.3em"
            height="1.3em"
            class="mr-1"
          />
          <template v-if="comment.like">({{ comment.like }})</template>
          <template v-else>Thích</template>
        </span>

        <span class="flex items-center mr-4 cursor-pointer">
          <Icon
            icon="fluent:thumb-dislike-24-filled"
            width="1.3em"
            height="1.3em"
            class="mr-1"
          />

          <template v-if="comment.dislike">({{ comment.dislike }})</template>
          <span v-else class="<sm:display-none">Không thích</span>
        </span>

        <span class="flex items-center mr-4 cursor-pointer">
          <Icon
            icon="fluent:comment-multiple-24-filled"
            width="1.3em"
            height="1.3em"
            class="mr-1"
          />
          <span class="<sm:display-none">Bình luận</span>
        </span>

        <span class="text-gray-400">{{
          dayjs(comment.created_at).fromNow()
        }}</span>
      </div>

      <template v-if="comment.replies">
        <Comments :comments="comment.replies" />
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue"
import type { RComment } from "src/apis/nettruyen/parsers/__helpers__/parseComment"
import dayjs from "src/logic/dayjs"

const props = defineProps<{
  comment: RComment
}>()

const NO_AVATAR =
  "https://st.truyenqqq.vn/template/frontend/images/noavatar.png"
</script>
