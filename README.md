# SillyTavernPlugins-Status

![2024-04-13T09:56:59.png][1]
本插件从美化对话状态栏+优化Token的角度出发而编写

### 数据
状态栏数据严格遵循JSON格式

    {
      "key": "string[必须使用字符串]"
    }

会自动识别“<数字>[%]”来进行不同效果的展示，人话：带百分号的会以进度条形式展示

### 参数
内容前：插入到每个对话最前方
内容后：插入到每个对话最后方
保留语句数量：将状态栏保存几个对话，如该项为2，则除最后两句话之外的对话框都会被删除
也是本插件实现节省Token的主要原理

  [1]: https://blog.chordvers.com/usr/uploads/2024/04/1009219051.png