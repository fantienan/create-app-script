# create-app 脚手架

> 参考create-react-app 脚手架工具的开发思路
> 集成开发模板

## 使用
### 使用npx每次运行命令都会拉取最新的create-app
```
npx create-app-script create <app-name>
```
### 使用全局安装，缺点再次使用时不会更新最新的create-app
```
yarn add create-app-script -g
create-app-script create <app-name>
```

### 创建应用
```
npx create-app-script create <app-name> 
npx create-app-script create <app-name> -t
npx create-app-script create <app-name> -r
```

### 添加page
```
npx create-app-script page <page-name> 
npx create-app-script page <page-name> -b
```

### 添加路由
```
npx create-app-script router <router-name> 
npx create-app-script router <router-name> -b
```


