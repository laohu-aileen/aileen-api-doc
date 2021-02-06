export interface Config {
  /**
   * 主机名
   */
  host?: string;

  /**
   * 是否启用,默认true
   */
  enable?: boolean;

  /**
   * 文档版本
   */
  version?: string;

  /**
   * 文档描述
   */
  description?: string;

  /**
   * 文档标题
   */
  title?: string;

  /**
   * 文档主页地址
   */
  indexPage?: string;

  /**
   * API配置地址
   */
  apiJson?: string;
}
