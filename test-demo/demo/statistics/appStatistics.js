// 需要声明在  manifest.json 的 features 属性中依赖模块
import storage from "@system.storage";
import nativeFetch from "@system.fetch";
import device from "@system.device";
import geolocation from "@system.geolocation";
import network from "@system.network";
import account from "@service.account";

// 不需要声明的全局模块
import app from "@system.app";
// 引入路由 组件 监听页面切换
import router from '@system.router';

// 配置文件
import APP_CONFIG from './statistics.config';

// 工具函数
const _toString = Object.prototype.toString;

function isObject(obj) {
	return obj !== null && typeof obj === "object";
}

function isPlainObject(obj) {
	return _toString.call(obj) === "[object Object]";
}

function isArray(obj) {
	return Array.isArray(obj);
}

function isEmptyObject(obj) {
	for (let n in obj) {
		return false;
	}
	return true;
}

// 对象转为查询字符串
function toQueryString(obj) {
	let str = "";
	for (let n in obj) {
		str += n + "=" + obj[n] + "&";
	}
	str = str.substring(0, str.length - 1);
	return str;
}

// 计算字符串的字节长度
function getByteLen(val) {
	let len = 0;
	for (let i = 0; i < val.length; i++) {
		if (val[i].match(/[^\x00-\xff]/gi) != null) {
			len += 2;
		} else {
			len += 1;
		}
	}
	return len;
}

//  驼峰式 转为 下划线式
function getKebabCase(str) {
	return str.replace(/[A-Z]/g, function (i) {
		return "_" + i.toLowerCase();
	});
}

// 下划线 转 驼峰式
function getCamelCase(str) {
	return str.replace(/_([a-z])/g, function (all, i) {
		return i.toUpperCase();
	});
}

//  CryptoJS 加密
function encrypt(data, req) {
	let keyLen = 16;
	// initKey 长度必须是16或者16的倍数
	let initKey = req;
	let len = (req.length % keyLen) == 0 ? 0 : (keyLen - (req.length % keyLen));

	for (let i = 0; i < len; i++) {
		initKey += "$";
	}

	let key = CryptoJS.enc.Latin1.parse(initKey);
	let iv = CryptoJS.enc.Latin1.parse(initKey);

	return CryptoJS.AES.encrypt(data, key, {
		iv: iv,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.ZeroPadding

	}).toString();
}

/*AES解密
* param : message 密文
* return : decrypted string 明文
*/

function decrypt(message, req) {
	let keyLen = 16;
	// initKey 长度必须是16或者16的倍数
	let initKey = req;
	let len = (req.length % keyLen) == 0 ? 0 : (keyLen - (req.length % keyLen));

	for (let i = 0; i < len; i++) {
		initKey += "$";
	}

	let key = CryptoJS.enc.Latin1.parse(initKey);
	let iv = CryptoJS.enc.Latin1.parse(initKey);

	let decrypted = "";
	decrypted = CryptoJS.AES.decrypt(message, key, {
		iv: iv,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.ZeroPadding
	});
	return decrypted.toString(CryptoJS.enc.Utf8);
}

//  storage 的key值
const STORAGE_KEY = "APP_STATISTICS_DATA";

//  请求封装
const NETWORK = {
	fetch: function (args) {
		let url = config.url + args.url;
		let obj = {
			url: config.url + args.url,
			fail: function (data, code) {
				// console.log(`请求失败, code = ${code}` , url );
			}
		};

		let arg = Object.assign(obj, args, { url });

		nativeFetch.fetch(obj);
	},
	get: function (args) {
		args.method = "GET";
		return this.fetch(args);
	},
	post: function (args) {
		args.method = "POST";
		return this.fetch(args);
	}
};

// 统计
const APP_STATISTICS = {
	// 基础信息
	baseData: {
		package: "",     // 应用包名：应用的唯一标识

		// 来源平台
		packageName: "", //发送日志时，key 需要修改  =>  channel

		// 快应用名称
		name: "",

		// 快应用 版本
		appVersionName: "", //发送日志时，key 需要修改  =>  svr

		// 设备唯一id
		device: "", //发送日志时，key 需要修改  => clientId

		mac: "",

		// 用户唯一id
		user: "", //发送日志时，key 需要修改  => osId

		// cuid 未授权时，js 生成的用户id
		cuid: "",

		// 请求id
		requestId: "req" + new Date().getTime(),

		// 是否加密
		hasEncrypt: "1",

		// 进入app的时间
		time: ""

		// 接口类型 ： 接口类型 ， 在发送请求的之前增加。
		// "actioin":""
	},

	// 设备信息
	deviceInfo: {
		// 品牌
		brand: "", // => make
		// 生产厂商
		manufacturer: "",
		// 型号
		model: "",
		// 产品名称
		product: "",
		// 操作系统
		osType: "",
		// 系统版本
		osVersionName: "", // => ovr
		// "osVersionCode":"",
		// 平台版本
		platformVersionName: "",
		// "platformVersionCode":"",

		// 语言
		language: "",

		// 地区
		region: "",

		screenWidth: "",
		screenHeight: "",

		// 网络类型
		netType: ""
	},

	// 地理位置
	location: {
		longitude: 0,
		latitude: 0
	},
	// router信息
	routeInfo:{
		page_name: '',
		page_path: ''
	},

	// 获取唯一 id 授权状态
	deviceIdWarrant: false,
	// 设备信息授权状态
	deviceInfoWarrant: false,
	// 地理位置授权状态
	getLocationWarrant: false,
	// 网络类型授权状态
	networkWarrant: false,

	// 打开app
	createApp(deviceData) {

		const APP = deviceData || { options: {}, _def: {} };
		
		// 兼容华为
		APP.options = APP.options || { env: {} };
		APP._def = APP._def || { manifest: {} };
		
		let d = new Date();
		// 解构出  env 和 manifest 对象
		let {
			options: { env },
			_def: { manifest }
		} = APP;
		// console.log( `options=` ,JSON.stringify( APP.options ));
		// 获取 packageName 值
		// let { source } = app.getInfo();

		// 渠道数据 account.getProvider()
		APP_STATISTICS.baseData.packageName = account.getProvider();

		// 进入时间
		APP_STATISTICS.baseData.time = d.getTime() + "";

		// 缓存  reqestId
		storage.set({
			key: "_SD_BD_REQUEST_ID_",
			value: APP_STATISTICS.baseData.requestId
		});

		// 读取 cuid
		APP_STATISTICS.getCuid();

		for ( let key in APP_STATISTICS.baseData ) {
			if (APP_STATISTICS.baseData.hasOwnProperty(key)) {
				// 应用信息保存
				if (manifest[key]) {
					APP_STATISTICS.baseData[key] = manifest[key];
				} else if (env[key]) {
					APP_STATISTICS.baseData[key] = env[key];
				}
			}
		}
		
		// 获取授权信息
		APP_STATISTICS.getWarrantData();

		// 初始化页面跳转监听
		APP_STATISTICS.watchRouter(( route )=>{

			APP_STATISTICS.routeInfo.page_name = route.name;
			APP_STATISTICS.routeInfo.page_path = route.path;

			// console.log( `路由变化了，路劲是：${ route.path },页面名称是：${ route.name }`);
			let args = Object.assign(
				{},
				APP_STATISTICS.baseData,
				APP_STATISTICS.deviceInfo,
				APP_STATISTICS.location,
				APP_STATISTICS.routeInfo 
			);			
			APP_STATISTICS.submitAction( APP_STATISTICS.handleData( args ) , '2' );
			
		});
	},
	// 获取授权信息
	getWarrantData() {
		// 读取设备id和用户id
		device.getId({
			type: ["device", "mac", "user"],
			success: function (data) {
				APP_STATISTICS.baseData.device = data.device;
				APP_STATISTICS.baseData.mac = data.mac;
				APP_STATISTICS.baseData.user = data.user;
			},
			fail: function (data, code) {
				APP_STATISTICS.getCuid();
			},
			complete: function () {
				APP_STATISTICS.deviceIdWarrant = true;
			}
		});
		// 获取设备信息
		device.getInfo({
			success: function (data) {
				for (const key in APP_STATISTICS.deviceInfo) {
					if (data.hasOwnProperty(key)) {
						APP_STATISTICS.deviceInfo[key] = data[key];
					}
				}

				// 品牌、型号、生产厂家 统一转换小写
				APP_STATISTICS.deviceInfo.brand = APP_STATISTICS.deviceInfo.brand.toLowerCase();
				APP_STATISTICS.deviceInfo.model = APP_STATISTICS.deviceInfo.model.toLowerCase();
				APP_STATISTICS.deviceInfo.manufacturer = APP_STATISTICS.deviceInfo.manufacturer.toLowerCase();
			},
			complete: function () {
				APP_STATISTICS.deviceInfoWarrant = true;
			}
		});

		// 获取地理位置
		geolocation.getLocation({
			success: function (data) {
				//  经度、纬度
				APP_STATISTICS.location.longitude = data.longitude;
				APP_STATISTICS.location.longitude = data.latitude;
			},
			complete: function () {
				APP_STATISTICS.getLocationWarrant = true;
			}
		});

		// 获取网络状况
		network.getType({
			success: function (data) {
				APP_STATISTICS.deviceInfo.netType = data.type;
			},
			complete: function () {				
				APP_STATISTICS.networkWarrant = true;
			}
		});

		// 监测用户是否完成授权
		this.lisenerWarranting();
	},

	// 读取cuid ，没有时， 生成cuid
	getCuid() {
		storage.get({
			key: "_SD_BD_CUID_",
			success: function (data) {
				let rid = "";
				if (data) {
					rid = data;
				} else {
					rid = APP_STATISTICS.createCuid();
					storage.set({
						key: "_SD_BD_CUID_",
						value: rid
					});
				}
				APP_STATISTICS.baseData.cuid = rid;
			},
			fail: function (data, code) {
				
				let rid = APP_STATISTICS.createCuid();
				storage.set({
					key: "_SD_BD_CUID_",
					value: rid
				});	
				APP_STATISTICS.baseData.cuid = rid;			
			}
		});
	},

	// 设置缓存
	setStorage() {
		// 缓存数据
		let data = {
			baseData: APP_STATISTICS.baseData,
			deviceInfo: APP_STATISTICS.deviceInfo,
			location: APP_STATISTICS.location,
			routeInfo:APP_STATISTICS.routeInfo, 
			creteTime: new Date()
		};

		storage.delete({
			key: STORAGE_KEY
		});

		storage.set({
			key: STORAGE_KEY,
			value: JSON.stringify(data),
			success: function () { }
		});
	},

	// 读取缓存
	getStorage() {
		let that = this;
		storage.get({
			key: STORAGE_KEY,
			success: function (data) {
				let storageData = data && JSON.parse(data);

				if (storageData) {
					delete storageData.creteTime;
					// 保存数据
					Object.assign(APP_STATISTICS, storageData);
				} else {
					// 没有缓存 ， 申请用户授权，获取数据
					that.getWarrantData();
				}
			},
			fail: function () {
				// 没有缓存 ， 申请用户授权，获取数据
				that.getWarrantData();
			}
		});
	},

	// 监听用户是否完成授权行为 （ 包含通过、未通过 ）
	lisenerWarranting() {
		const timer = setInterval(() => {
			// 所有授权完成，发送日志
			if (
				this.deviceIdWarrant &&
				this.deviceInfoWarrant &&
				this.getLocationWarrant &&
				this.networkWarrant
			) {
				clearInterval(timer);
				// 路由信息
				let routerInfo = router.getState() || {};
				APP_STATISTICS.routeInfo.page_name = routerInfo.name || '';
				APP_STATISTICS.routeInfo.page_path = routerInfo.path || '';


				let args = Object.assign(
					{},
					APP_STATISTICS.baseData,
					APP_STATISTICS.deviceInfo,
					APP_STATISTICS.location,
					APP_STATISTICS.routeInfo 
				);
								
				// 缓存数据
				APP_STATISTICS.setStorage();

				// 读取 requestId
				storage.get({
					key: "_SD_BD_REQUEST_ID_",
					success: function (data) {
						args.requestId = data;
						let encryptArgs = APP_STATISTICS.handleData(args);
						APP_STATISTICS.submitAction( encryptArgs, '1' );
					},
					fail: function () {
						args.requestId = APP_STATISTICS.baseData.requestId;
						let encryptArgs = APP_STATISTICS.handleData(args);
						APP_STATISTICS.submitAction( encryptArgs, '1' );
					}
				});
			}
		}, 10);
	},

	/*
	*监听页面切换
	*/
	watchRouter(cb){
		let lastLen = router.getLength();
		let lastPath = router.getState() && router.getState().path;		
		setInterval(()=>{
		
			let routerLen = router.getLength();
			let path = router.getState() && router.getState().path;	
			if( lastPath !== path || lastLen !== routerLen ){
				if( lastPath ){
					cb && cb( router.getState() );
				}				
				lastLen = routerLen;
				lastPath = path;
				let routerInfo = router.getState() || {};
				APP_STATISTICS.routeInfo.page_name = routerInfo.name || '';
				APP_STATISTICS.routeInfo.page_path = routerInfo.path || '';								
			} 
		},200);
	},

	/**
	 *
	 * @description 生成 cuid. 生成机制 : 时间戳  + '-' + 四位随机字符串 + '-' + 四位随机字符串 + '-' + 四位随机字符串
	 * @returns string 
	 */
	createCuid() {
		let id = "";
		let d = new Date();
		function randomStr() {
			// 长度为 4 的随机字符串
			return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
		}

		id = d.getTime() + "-" + randomStr() + "-" + randomStr() + "-" + randomStr();

		return id;
	},

	/**
	 * 格式化日志数据
	 * @param {object} args 原始数据
	 */
	handleData(args) {
		// key值替换 ：统一修改为公司规定字段
		let newKeys = {
			packageName: "channel",

			appVersionName: "svr",

			device: "clientId",

			user: "osId",

			brand: "make",

			osVersionName: "ovr",

			mac: "infoMa"
		};

		// 加密参数 : 注意， 这里的 key 是经过 newKeys 转换后的 key
		let encryptArgs = ["clientId", "osId", "cuid", "infoMa"];

		// key值命名转换： 驼峰式 转为 下划线式
		let change_args = {};
		for (const key in args) {
			if (args.hasOwnProperty(key)) {
				// key 替换
				let newKey = newKeys[key] || key;

				// 检查参数是否需要加密
				let index = encryptArgs.findIndex(item => {
					return item === newKey;
				});

				if (index < 0) {
					// 不需要加密
					change_args[getKebabCase(newKey)] = args[key];
				} else {
					// 加密
					change_args[getKebabCase(newKey)] = encrypt(args[key], args["requestId"]);
				}
			}
		}
		return change_args;
	},

	/**
	 * 发送日志 , 只用于发送数据
	 * @param {object} args  数据
	 * @param {string} actionType  请求类型
	 */
	submitAction(args, actionType) {
		let type = actionType || "";

		args.action = type;
		args.app_id = APP_CONFIG.app_key;
		// JSON转为查询字符串
		let argsToQueryStr = toQueryString(args);

		// console.log(`参数查看：>>>>>>> ${JSON.stringify(args)} `);
		console.log(`cuid:${ decrypt(args.cuid, args.request_id) }`); 
		// 提交日志
		NETWORK.get({
			url: "/a.gif?" + argsToQueryStr,
			success(data) {
				// if (data.code === 200) {
				// 	// 关闭之前设置缓存
				// 	console.log(`日志发送成功code= ${data.code}`); 
				// }
			}
		});
	},

	/**
	 * 发送关闭 app 日志
	 *
	 */
	destroyLog(){

		let args = Object.assign(
			{},
			APP_STATISTICS.baseData,
			APP_STATISTICS.deviceInfo,
			APP_STATISTICS.location,
			APP_STATISTICS.routeInfo 
		);			
		APP_STATISTICS.submitAction( APP_STATISTICS.handleData( args ) , '0' );
		
	}	
};

// 全局变量
const hookTo = global.__proto__ || global;

// 只暴露接口
hookTo.APP_STATISTICS = {
	app_sta_init: APP_STATISTICS.createApp,
	app_destroy: APP_STATISTICS.destroyLog
};

export default {
	app_sta_init: APP_STATISTICS.createApp,
	app_destroy: APP_STATISTICS.destroyLog
};
