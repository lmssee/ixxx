import { question, selection } from 'a-command';
import { typeOf } from 'a-js-tools';
import {
  _p,
  Color,
  getDirectoryBy,
  pathJoin,
  readFileToJsonSync,
  runOtherCode,
} from 'a-node-tools';
import command from './command.js';
import { ArgsMapItemType } from 'a-command/types/args';

export const gitBind = {
  'git   (一些关于 git 的操作)': [
    `commit (git 提交代码，是 ${Color.red(
      'commit',
    )} 提交啊，不是 ${Color.fromRgb('push', '#666')} 推送)`,
    'merge (合并两个分支)',
    'tag (给提交打上 tag)',
  ],
};

export default async function (params: ArgsMapItemType) {
  if (typeOf(params) != 'object') params = { value: [] };
  /** 提交代码 */
  if (params.commit) {
    await gitCommit(params.commit.join(' '));
  } else if (params.merge) {
    /** 合并代码 */
    await gitMerge(params.merge.join(''));
  } else if (params.tag) {
    await beforeTagCommit();
  } else command.help('git');
  //  else if (params)
}

/** 整理 git
 *
 * @param [commitMessage="版本维护"]  提交信息
 * @param [tag=false]  是否给提交打上 tag
 */
export async function gitCommit(
  commitMessage: string = '版本维护',
  tag: boolean = false,
) {
  /// 检测当前目录下有没有  .git  文件夹
  const cwd = getDirectoryBy('.git', 'directory');
  if (cwd == undefined) {
    return _p(
      Color.fromHexadecimal(
        'not a git repository（当前目录非 git 储存库）',
        '#ff0',
      ),
    );
  }
  const addResult = await runOtherCode({ code: 'git add .', cwd });
  // 倘若没有成功，可能是执行目录下没有  .git
  if (!addResult.success) {
    return console.log(addResult.error) != undefined;
  }
  const gitStatus = await runOtherCode({ code: 'git status', cwd });
  if (!/nothing to commit, working tree clean/.test(gitStatus.data || '')) {
    const addResult = await runOtherCode({ code: `git add .`, cwd });
    if (!addResult.success) return console.log(addResult.error) != undefined;
    if (commitMessage.trim() == '') {
      commitMessage = await question({
        text: '请输入提交信息',
        private: true,
      });
    }
    const commitResult = await runOtherCode({
      code: `git commit -m "${commitMessage}"`,
      cwd,
    });
    if (!commitResult.success)
      return console.log(commitResult.error) != undefined;
    // 打印是 stderr
    if (commitResult.error) console.log(commitResult.error);
    await runOtherCode({ code: 'git push', cwd });
    // 需要打标签
    if (tag) await tagCommit(commitMessage);
    return true;
  }
  return false;
}

/** 打 tag 之前 */
async function beforeTagCommit() {
  await tagCommit(
    await question({
      text: '请输入待标记的信息',
      private: true,
    }),
  );
}

/** 给提交打上 tag  */
async function tagCommit(commitMessage: string) {
  const cwd = getDirectoryBy('package.json', 'file', process.cwd());
  if (cwd == undefined) return true;
  const version = readFileToJsonSync(pathJoin(cwd, 'package.json')).version;
  if (!version) return true;
  await runOtherCode({
    code: `git tag -a  v${version} -m '${commitMessage}'`,
    cwd,
  });
  await runOtherCode({ code: 'git push origin --tag', cwd });
}

/** 合并两个分支  */
async function gitMerge(params: string) {
  if (params == '') {
    const branchList = await runOtherCode('git branch -a');
    console.log(branchList.data);
    params = await question({
      text: '请输入要合并分支的名称',
      private: true,
    });
  }
  const mergeType: number = (await selection(
    {
      data: [
        '正常快进合并',
        '非快进合并 （--no-ff）',
        '多提交记录合并为一条 （--squash）',
      ],
      private: true,
    },
    'number',
  )) as number;
  await runOtherCode(
    `git merge ${params}  ${['', '--no-ff', '--squash'][mergeType]}`,
  );
}
