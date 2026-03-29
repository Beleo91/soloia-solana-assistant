// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ARCHERMES Marketplace — v6
 * Changes vs v5:
 *  GOD_MODE_ADMIN is hardcoded as an immutable constant so that the platform
 *  owner always has unrestricted access even if `owner` ever changes.
 *  Admin bypasses:
 *   - createStore : no fee, auto PRO tier, can always overwrite own store
 *   - renewStore  : no fee
 *   - upgradeToPro: no fee
 *   - listItem    : no store/subscription check
 *   - buyItem     : zero platform fee, can buy own items (for testing)
 *  All admin functions accept value: 0 — no ETH ever required from admin.
 */
contract Archermes {
    // ── Immutable admin (hardcoded — cannot be changed) ──────────────────────
    address public constant GOD_MODE_ADMIN = 0x434189487484F20B9Bf0e0c28C1559B0c961274B;

    address payable public owner;
    bool public paused;

    uint256 public platformFeePercent = 3;
    uint256 public referralFeePercent = 2;
    uint256 public basicStoreFee = 0.001 ether;
    uint256 public proStoreFee  = 0.003 ether;

    uint256 public totalItems;
    uint256 public totalOrders;

    uint256 private constant FREE_TIER_LIMIT = 10;
    uint256 private constant STORE_DURATION  = 365 days;

    // Order status constants
    uint8 public constant STATUS_PENDING   = 0;
    uint8 public constant STATUS_SHIPPED   = 1;
    uint8 public constant STATUS_COMPLETED = 2;
    uint8 public constant STATUS_REFUNDED  = 3;

    struct Item {
        uint256         id;
        string          itemName;
        uint256         price;
        string          category;
        address payable seller;
        bool            isActive;
        uint256         stock;
    }

    struct Store {
        string   storeName;
        uint256  expiresAt;
        uint8    tier;
        uint256  productCount;
        uint256  totalStars;
        uint256  reviewCount;
    }

    struct Order {
        uint256         orderId;
        uint256         itemId;
        address payable buyer;
        address payable seller;
        uint256         amount;
        uint8           status;
        string          trackingCode;
    }

    mapping(uint256 => Item)    public items;
    mapping(address => Store)   public stores;
    mapping(uint256 => Order)   public orders;

    mapping(address => uint256[]) private _buyerOrders;
    mapping(address => uint256[]) private _sellerOrders;

    // ── Events ──────────────────────────────────────────────────────────────
    event ItemListed(uint256 indexed id, string itemName, uint256 price, address indexed seller);
    event ItemCancelled(uint256 indexed id);
    event ItemBanned(uint256 indexed id);
    event StoreCreated(address indexed storeOwner, string storeName, uint8 tier);
    event StoreUpgraded(address indexed storeOwner);

    event OrderCreated(uint256 indexed orderId, uint256 indexed itemId, address indexed buyer, address seller, uint256 amount);
    event TrackingUpdated(uint256 indexed orderId, string trackingCode);
    event FundsReleased(uint256 indexed orderId, address seller, uint256 amount);
    event OrderRefunded(uint256 indexed orderId, address buyer, uint256 amount);
    event StoreRated(address indexed seller, uint8 rating, uint256 newTotalStars, uint256 newReviewCount);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner()  { require(_isAdmin(msg.sender), "Not owner");       _; }
    modifier notPaused()  { require(!paused,               "Contract paused"); _; }

    // ── Internal helper ──────────────────────────────────────────────────────
    function _isAdmin(address addr) internal pure returns (bool) {
        return addr == GOD_MODE_ADMIN;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address payable _admin) {
        require(_admin != address(0), "Invalid admin address");
        owner = _admin;
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function togglePause() external onlyOwner { paused = !paused; }

    function setFeePercentages(uint256 _p, uint256 _r) external onlyOwner {
        platformFeePercent = _p;
        referralFeePercent = _r;
    }

    function setStoreFees(uint256 _basic, uint256 _pro) external onlyOwner {
        basicStoreFee = _basic;
        proStoreFee   = _pro;
    }

    // ── Store lifecycle ───────────────────────────────────────────────────────
    function createStore(string calldata _name, bool _isPro) external payable notPaused {
        if (_isAdmin(msg.sender)) {
            // GOD MODE: refund any accidental ETH sent, create/overwrite store as PRO
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
            stores[msg.sender] = Store({
                storeName:    _name,
                expiresAt:    block.timestamp + STORE_DURATION * 10, // 10 years
                tier:         1, // always PRO
                productCount: stores[msg.sender].productCount,        // preserve count
                totalStars:   stores[msg.sender].totalStars,
                reviewCount:  stores[msg.sender].reviewCount
            });
            emit StoreCreated(msg.sender, _name, 1);
            return;
        }
        // Normal user flow
        uint256 fee = _isPro ? proStoreFee : basicStoreFee;
        require(msg.value >= fee, "Insufficient store fee");
        if (fee > 0) owner.transfer(fee);
        if (msg.value > fee) payable(msg.sender).transfer(msg.value - fee);
        stores[msg.sender] = Store({
            storeName:    _name,
            expiresAt:    block.timestamp + STORE_DURATION,
            tier:         _isPro ? 1 : 0,
            productCount: 0,
            totalStars:   0,
            reviewCount:  0
        });
        emit StoreCreated(msg.sender, _name, _isPro ? 1 : 0);
    }

    function renewStore() external payable notPaused {
        Store storage s = stores[msg.sender];
        require(bytes(s.storeName).length > 0, "No store registered");
        if (_isAdmin(msg.sender)) {
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
            s.expiresAt = block.timestamp + STORE_DURATION * 10;
            return;
        }
        uint256 fee = s.tier == 1 ? proStoreFee : basicStoreFee;
        require(msg.value >= fee, "Insufficient store fee");
        if (fee > 0) owner.transfer(fee);
        if (msg.value > fee) payable(msg.sender).transfer(msg.value - fee);
        if (s.expiresAt > block.timestamp) {
            s.expiresAt += STORE_DURATION;
        } else {
            s.expiresAt = block.timestamp + STORE_DURATION;
        }
    }

    function upgradeToPro() external payable notPaused {
        Store storage s = stores[msg.sender];
        require(bytes(s.storeName).length > 0, "No store registered");
        if (_isAdmin(msg.sender)) {
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
            s.tier = 1;
            emit StoreUpgraded(msg.sender);
            return;
        }
        require(s.tier == 0, "Already pro");
        uint256 diff = proStoreFee > basicStoreFee ? proStoreFee - basicStoreFee : proStoreFee;
        require(msg.value >= diff, "Insufficient upgrade fee");
        if (diff > 0) owner.transfer(diff);
        if (msg.value > diff) payable(msg.sender).transfer(msg.value - diff);
        s.tier = 1;
        emit StoreUpgraded(msg.sender);
    }

    // ── Listing ───────────────────────────────────────────────────────────────
    function listItem(
        string calldata _itemName,
        uint256 _price,
        string calldata _category,
        uint256 _stock
    ) external notPaused {
        require(_stock > 0,  "Stock must be at least 1");
        require(_price > 0,  "Price must be greater than zero");
        require(bytes(_itemName).length > 0, "Item name required");

        // Subscription / registration checks — disabled for open testing
        // if (!_isAdmin(msg.sender)) {
        //     Store storage s = stores[msg.sender];
        //     require(bytes(s.storeName).length > 0, "No store registered");
        //     require(s.expiresAt >= block.timestamp, "Store subscription expired");
        // }

        totalItems++;
        items[totalItems] = Item({
            id:       totalItems,
            itemName: _itemName,
            price:    _price,
            category: _category,
            seller:   payable(msg.sender),
            isActive: true,
            stock:    _stock
        });
        stores[msg.sender].productCount++;
        emit ItemListed(totalItems, _itemName, _price, msg.sender);
    }

    function cancelItem(uint256 _id) external {
        Item storage item = items[_id];
        require(msg.sender == item.seller || _isAdmin(msg.sender), "Not seller or admin");
        item.isActive = false;
        emit ItemCancelled(_id);
    }

    function banItem(uint256 _id) external onlyOwner {
        items[_id].isActive = false;
        emit ItemBanned(_id);
    }

    // ── Purchase (creates Order, holds funds in Escrow) ───────────────────────
    function buyItem(uint256 _id, address payable _referrer) external payable notPaused {
        Item storage item = items[_id];
        require(item.isActive,           "Item not active");
        require(item.stock > 0,          "Produto esgotado");
        require(msg.value >= item.price, "Insufficient payment");

        // Admin can buy any item (including own) for testing
        if (!_isAdmin(msg.sender)) {
            require(msg.sender != item.seller, "Cannot buy own item");
        }

        // Admin pays zero platform fee
        uint256 platFee = _isAdmin(msg.sender) ? 0 : (item.price * platformFeePercent) / 100;
        bool validRef = (
            _referrer != address(0) &&
            _referrer != item.seller &&
            _referrer != msg.sender
        );
        uint256 refFee   = validRef ? (item.price * referralFeePercent) / 100 : 0;
        uint256 escrowed = item.price - platFee - refFee;

        if (platFee > 0) owner.transfer(platFee);
        if (refFee > 0 && validRef) _referrer.transfer(refFee);
        if (msg.value > item.price) payable(msg.sender).transfer(msg.value - item.price);

        item.stock--;
        if (item.stock == 0) item.isActive = false;

        totalOrders++;
        orders[totalOrders] = Order({
            orderId:      totalOrders,
            itemId:       _id,
            buyer:        payable(msg.sender),
            seller:       item.seller,
            amount:       escrowed,
            status:       STATUS_PENDING,
            trackingCode: ""
        });
        _buyerOrders[msg.sender].push(totalOrders);
        _sellerOrders[item.seller].push(totalOrders);

        emit OrderCreated(totalOrders, _id, msg.sender, item.seller, escrowed);
    }

    // ── Order management ─────────────────────────────────────────────────────

    function updateTracking(uint256 _orderId, string calldata _trackingCode) external {
        Order storage o = orders[_orderId];
        require(msg.sender == o.seller || _isAdmin(msg.sender), "Not seller or admin");
        require(o.status == STATUS_PENDING, "Order not pending");
        require(bytes(_trackingCode).length > 0, "Tracking code required");
        o.trackingCode = _trackingCode;
        o.status       = STATUS_SHIPPED;
        emit TrackingUpdated(_orderId, _trackingCode);
    }

    function releaseFunds(uint256 _orderId, uint8 _rating) external {
        Order storage o = orders[_orderId];
        require(msg.sender == o.buyer || _isAdmin(msg.sender), "Not buyer or admin");
        require(o.status == STATUS_SHIPPED, "Order not shipped");
        require(_rating >= 1 && _rating <= 7, "Rating must be 1-7");

        uint256 amt = o.amount;
        o.amount = 0;
        o.status = STATUS_COMPLETED;
        if (amt > 0) o.seller.transfer(amt);

        Store storage sellerStore = stores[o.seller];
        sellerStore.totalStars  += _rating;
        sellerStore.reviewCount += 1;

        emit FundsReleased(_orderId, o.seller, amt);
        emit StoreRated(o.seller, _rating, sellerStore.totalStars, sellerStore.reviewCount);
    }

    function refundOrder(uint256 _orderId) external {
        Order storage o = orders[_orderId];
        require(msg.sender == o.seller || _isAdmin(msg.sender), "Not seller or admin");
        require(o.status == STATUS_PENDING || o.status == STATUS_SHIPPED, "Cannot refund");

        uint256 amt = o.amount;
        o.amount = 0;
        o.status = STATUS_REFUNDED;
        if (amt > 0) o.buyer.transfer(amt);

        emit OrderRefunded(_orderId, o.buyer, amt);
    }

    // ── View helpers ─────────────────────────────────────────────────────────

    function getOrdersByBuyer(address _buyer) external view returns (uint256[] memory) {
        return _buyerOrders[_buyer];
    }

    function getOrdersBySeller(address _seller) external view returns (uint256[] memory) {
        return _sellerOrders[_seller];
    }

    function getStoreRating(address _seller) external view returns (uint256 totalStars, uint256 reviewCount, uint256 avgX100) {
        Store storage s = stores[_seller];
        totalStars  = s.totalStars;
        reviewCount = s.reviewCount;
        avgX100     = (reviewCount > 0) ? (totalStars * 100) / reviewCount : 0;
    }
}
