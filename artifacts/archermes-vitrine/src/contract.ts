export const CONTRACT_ADDRESS = '0x5C39699d4fb56225ec9da2e9FE31b0A5f83b8cB9';

export const CONTRACT_ABI = [
  // ── Admin ────────────────────────────────────────────────────────────────
  { inputs: [], name: 'togglePause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_p', type: 'uint256' }, { internalType: 'uint256', name: '_r', type: 'uint256' }], name: 'setFeePercentages', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_basic', type: 'uint256' }, { internalType: 'uint256', name: '_pro', type: 'uint256' }], name: 'setStoreFees', outputs: [], stateMutability: 'nonpayable', type: 'function' },

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
      { internalType: 'uint256', name: '_stock',    type: 'uint256' },
    ],
    name: 'listItem', outputs: [], stateMutability: 'nonpayable', type: 'function',
  },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'cancelItem', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'banItem', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }, { internalType: 'string', name: '_trackingCode', type: 'string' }], name: 'setTrackingCode', outputs: [], stateMutability: 'nonpayable', type: 'function' },

  // ── Purchase ─────────────────────────────────────────────────────────────
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }, { internalType: 'address payable', name: '_referrer', type: 'address' }], name: 'buyItem', outputs: [], stateMutability: 'payable', type: 'function' },

  // ── Escrow ────────────────────────────────────────────────────────────────
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'confirmDelivery', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'uint256', name: '_id', type: 'uint256' }], name: 'refundBuyer', outputs: [], stateMutability: 'nonpayable', type: 'function' },

  // ── Events ───────────────────────────────────────────────────────────────
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }, { indexed: false, internalType: 'string', name: 'itemName', type: 'string' }, { indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'seller', type: 'address' }], name: 'ItemListed', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }, { indexed: true, internalType: 'address', name: 'buyer', type: 'address' }], name: 'ItemBought', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }], name: 'ItemCancelled', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }], name: 'ItemBanned', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }, { indexed: false, internalType: 'address', name: 'liberadoPor', type: 'address' }], name: 'DeliveryConfirmed', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }], name: 'RefundIssued', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'owner', type: 'address' }, { indexed: false, internalType: 'string', name: 'storeName', type: 'string' }, { indexed: false, internalType: 'uint8', name: 'tier', type: 'uint8' }], name: 'StoreCreated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'owner', type: 'address' }], name: 'StoreUpgraded', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' }, { indexed: false, internalType: 'string', name: 'trackingCode', type: 'string' }], name: 'TrackingAdded', type: 'event' },

  // ── Views ─────────────────────────────────────────────────────────────────
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address payable', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalItems', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'platformFeePercent', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'referralFeePercent', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'basicStoreFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'proStoreFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'items',
    outputs: [
      { internalType: 'uint256',         name: 'id',          type: 'uint256' },
      { internalType: 'string',          name: 'itemName',    type: 'string' },
      { internalType: 'uint256',         name: 'price',       type: 'uint256' },
      { internalType: 'string',          name: 'category',    type: 'string' },
      { internalType: 'string',          name: 'trackingCode',type: 'string' },
      { internalType: 'address payable', name: 'seller',      type: 'address' },
      { internalType: 'address payable', name: 'buyer',       type: 'address' },
      { internalType: 'address payable', name: 'referrer',    type: 'address' },
      { internalType: 'bool',            name: 'isSold',      type: 'bool' },
      { internalType: 'bool',            name: 'isDelivered', type: 'bool' },
      { internalType: 'bool',            name: 'isRefunded',  type: 'bool' },
      { internalType: 'bool',            name: 'isActive',    type: 'bool' },
      { internalType: 'uint256',         name: 'stock',       type: 'uint256' },
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
    ],
    stateMutability: 'view', type: 'function',
  },
];
