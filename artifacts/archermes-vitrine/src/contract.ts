// v7 — deployed 2026-03-29 — tx 0xe81853dddf8f97353544362c2746cde9e836a4a7ca7e672b40e91bb3d5a8cef6
// GOD_MODE_ADMIN hardcoded in contract: 0x434189487484F20B9Bf0e0c28C1559B0c961274B
// v7 changes: deliveryAddress in Order, shippingFee (0.001 ETH), buyItem gains _deliveryAddress param
export const CONTRACT_ADDRESS = '0x1c3517d9920d16b2e465c0B19Ec412F5aF915ee0';

export const CONTRACT_ABI = [
  // ── Admin ────────────────────────────────────────────────────────────────
  { inputs: [], name: 'GOD_MODE_ADMIN', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'togglePause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_p', type: 'uint256' }, { internalType: 'uint256', name: '_r', type: 'uint256' }], name: 'setFeePercentages', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_basic', type: 'uint256' }, { internalType: 'uint256', name: '_pro', type: 'uint256' }], name: 'setStoreFees', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_fee', type: 'uint256' }], name: 'setShippingFee', outputs: [], stateMutability: 'nonpayable', type: 'function' },

  // ── Store lifecycle ───────────────────────────────────────────────────────
  { inputs: [{ internalType: 'string', name: '_name', type: 'string' }, { internalType: 'bool', name: '_isPro', type: 'bool' }], name: 'createStore', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [], name: 'renewStore', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [], name: 'upgradeToPro', outputs: [], stateMutability: 'payable', type: 'function' },

  // ── Listing ───────────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: 'string',  name: '_itemName', type: 'string' },
      { internalType: 'uint256', name: '_price',    type: 'uint256' },
      { internalType: 'string',  name: '_category', type: 'string' },
    ],
    name: 'listItem', outputs: [], stateMutability: 'nonpayable', type: 'function',
  },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'cancelItem', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'banItem', outputs: [], stateMutability: 'nonpayable', type: 'function' },

  // ── Purchase (v7: deliveryAddress param added) ────────────────────────────
  {
    inputs: [
      { internalType: 'uint256',         name: '_id',              type: 'uint256' },
      { internalType: 'address payable', name: '_referrer',        type: 'address' },
    ],
    name: 'buyItem', outputs: [], stateMutability: 'payable', type: 'function',
  },

  // ── Order management ─────────────────────────────────────────────────────
  { inputs: [{ internalType: 'uint256', name: '_orderId', type: 'uint256' }, { internalType: 'string', name: '_trackingCode', type: 'string' }], name: 'updateTracking', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_orderId', type: 'uint256' }, { internalType: 'uint8', name: '_rating', type: 'uint8' }], name: 'releaseFunds', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_orderId', type: 'uint256' }], name: 'refundOrder', outputs: [], stateMutability: 'nonpayable', type: 'function' },

  // ── Events ───────────────────────────────────────────────────────────────
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }, { indexed: false, internalType: 'string', name: 'itemName', type: 'string' }, { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'seller', type: 'address' }], name: 'ItemListed', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }], name: 'ItemCancelled', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }], name: 'ItemBanned', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'storeOwner', type: 'address' }, { indexed: false, internalType: 'string', name: 'storeName', type: 'string' }, { indexed: false, internalType: 'uint8', name: 'tier', type: 'uint8' }], name: 'StoreCreated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'storeOwner', type: 'address' }], name: 'StoreUpgraded', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' }, { indexed: true, internalType: 'uint256', name: 'itemId', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'buyer', type: 'address' }, { indexed: false, internalType: 'address', name: 'seller', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'OrderCreated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' }, { indexed: false, internalType: 'string', name: 'trackingCode', type: 'string' }], name: 'TrackingUpdated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' }, { indexed: false, internalType: 'address', name: 'seller', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'FundsReleased', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' }, { indexed: false, internalType: 'address', name: 'buyer', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'OrderRefunded', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'seller', type: 'address' }, { indexed: false, internalType: 'uint8', name: 'rating', type: 'uint8' }, { indexed: false, internalType: 'uint256', name: 'newTotalStars', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'newReviewCount', type: 'uint256' }], name: 'StoreRated', type: 'event' },

  // ── Views ─────────────────────────────────────────────────────────────────
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address payable', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalItems', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalOrders', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'platformFeePercent', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'referralFeePercent', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'basicStoreFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'proStoreFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'shippingFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'items',
    outputs: [
      { internalType: 'uint256', name: 'id',          type: 'uint256' },
      { internalType: 'string',  name: 'name',        type: 'string'  },
      { internalType: 'uint256', name: 'price',       type: 'uint256' },
      { internalType: 'string',  name: 'category',    type: 'string'  },
      { internalType: 'string',  name: 'trackingCode',type: 'string'  },
      { internalType: 'address', name: 'seller',      type: 'address' },
      { internalType: 'address', name: 'buyer',       type: 'address' },
      { internalType: 'address', name: 'referrer',    type: 'address' },
      { internalType: 'bool',    name: 'isSold',      type: 'bool'    },
      { internalType: 'bool',    name: 'isDelivered', type: 'bool'    },
      { internalType: 'bool',    name: 'isRefunded',  type: 'bool'    },
      { internalType: 'bool',    name: 'isActive',    type: 'bool'    },
    ],
    stateMutability: 'view', type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'orders',
    outputs: [
      { internalType: 'uint256',         name: 'orderId',         type: 'uint256' },
      { internalType: 'uint256',         name: 'itemId',          type: 'uint256' },
      { internalType: 'address payable', name: 'buyer',           type: 'address' },
      { internalType: 'address payable', name: 'seller',          type: 'address' },
      { internalType: 'uint256',         name: 'amount',          type: 'uint256' },
      { internalType: 'uint8',           name: 'status',          type: 'uint8' },
      { internalType: 'string',          name: 'trackingCode',    type: 'string' },
      { internalType: 'string',          name: 'deliveryAddress', type: 'string' },
    ],
    stateMutability: 'view', type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stores',
    outputs: [
      { internalType: 'string',  name: 'storeName',    type: 'string' },
      { internalType: 'uint256', name: 'expiresAt',    type: 'uint256' },
      { internalType: 'uint8',   name: 'tier',         type: 'uint8' },
      { internalType: 'uint256', name: 'productCount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStars',   type: 'uint256' },
      { internalType: 'uint256', name: 'reviewCount',  type: 'uint256' },
    ],
    stateMutability: 'view', type: 'function',
  },
  { inputs: [{ internalType: 'address', name: '_buyer', type: 'address' }], name: 'getOrdersByBuyer', outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '_seller', type: 'address' }], name: 'getOrdersBySeller', outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'address', name: '_seller', type: 'address' }],
    name: 'getStoreRating',
    outputs: [
      { internalType: 'uint256', name: 'totalStars',  type: 'uint256' },
      { internalType: 'uint256', name: 'reviewCount', type: 'uint256' },
      { internalType: 'uint256', name: 'avgX100',     type: 'uint256' },
    ],
    stateMutability: 'view', type: 'function',
  },
];
