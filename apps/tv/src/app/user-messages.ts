import { DomainError } from '../../../../packages/contracts/src/index.ts';
/** Viewer-facing wording. Internal codes stay in diagnostics; unknown outcomes are
 * never presented as failures that invite a retry. */
export function playbackFailureText(error: unknown): string {
  const code = error instanceof DomainError ? error.code : 'unknown';
  return code === 'login' ? '登录已过期，请在账号中重新扫码后再播放' : code === 'permission' ? '当前账号没有该内容的播放权限' :
    code === 'unsupported' ? '这台电视暂时无法播放此视频源，可返回选择其他画质或内容' : code === 'unknown' ? '播放资源尚未释放，请退出并重新打开应用' :
    code === 'timeout' ? '播放源响应超时，可返回后重试' : code === 'network' ? '网络连接中断，播放未完成，可返回后重试' : '播放未完成，可返回重新选择';
}
export function contentLoadFailureText(kept: boolean): string {
  return `内容暂时无法加载。${kept ? '下方保留上次内容，' : ''}可重试或换个栏目`;
}
