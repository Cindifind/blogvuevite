/**
 * Protobuf 音乐信息解析工具
 * 用于解码后端返回的 GZIP + Base64 压缩的 protobuf 数据
 *
 * proto 定义:
 *   message MusicInfo {
 *     string id = 1;
 *     string name = 2;
 *     string artists_name = 3;
 *     string picurl = 4;
 *     string music_duration = 5;
 *   }
 *   message MusicInfoList {
 *     repeated MusicInfo items = 1;
 *   }
 */
import * as protobuf from 'protobufjs'

// 使用 protobufjs 的 Root 动态定义 schema（与 musicInfo.proto 保持一致）
const root = new protobuf.Root()

const MusicInfo = new protobuf.Type('MusicInfo')
  .add(new protobuf.Field('id', 1, 'string'))
  .add(new protobuf.Field('name', 2, 'string'))
  .add(new protobuf.Field('artists_name', 3, 'string'))
  .add(new protobuf.Field('picurl', 4, 'string'))
  .add(new protobuf.Field('music_duration', 5, 'string'))

const MusicInfoList = new protobuf.Type('MusicInfoList')
  .add(new protobuf.Field('items', 1, 'MusicInfo', 'repeated'))

root.add(MusicInfo)
root.add(MusicInfoList)

/**
 * Base64 字符串解码为 Uint8Array
 * @param {string} base64 - Base64 编码的字符串
 * @returns {Uint8Array}
 */
const base64ToUint8Array = (base64) => {
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

/**
 * 使用浏览器 DecompressionStream API 解压 GZIP 数据
 * @param {Uint8Array} compressedData - GZIP 压缩的数据
 * @returns {Promise<Uint8Array>}
 */
const gunzipAsync = async (compressedData) => {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()

  // 异步写入数据
  writer.write(compressedData).then(() => writer.close())

  // 读取解压后的数据
  const chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // 合并所有 chunk
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

/**
 * 解析后端返回的 GZIP+Base64 压缩的 protobuf 音乐列表
 * @param {string} compressedBase64 - 后端返回的压缩后的 Base64 字符串
 * @returns {Promise<Array>} 解析后的音乐列表
 *   每项格式: { id, name, artistsname, picurl, musicDuration }
 */
export const decodeMusicInfoList = async (compressedBase64) => {
  if (!compressedBase64) return []

  // 1. Base64 → Uint8Array
  const gzippedBytes = base64ToUint8Array(compressedBase64)

  // 2. GZIP 解压 → protobuf 原始字节
  const protoBytes = await gunzipAsync(gzippedBytes)

  // 3. protobuf 解码
  const decoded = MusicInfoList.decode(protoBytes)
  const items = decoded.items || []

  // 4. 转换为前端使用的对象格式（字段名与现有代码兼容）
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    artistsname: item.artists_name,
    picurl: item.picurl,
    musicDuration: item.music_duration,
    // 保持兼容性别名
    artists: item.artists_name,
    artist: item.artists_name,
  }))
}
