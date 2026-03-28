// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ARCHERMES Marketplace — v3
 * Changes vs v2:
 *  1. Item struct gains `uint256 stock` — quantity of units available.
 *  2. listItem() requires _stock >= 1.
 *  3. buyItem() requires stock > 0 and decrements it; when stock reaches 0
 *     the item becomes inactive (sold out).
 *  4. cancelItem() emits ItemCancelled event so the vitrine syncs in real time.
 */
contract Archermes {
    address payable public owner;
    bool public paused;

    uint256 public platformFeePercent = 3;
    uint256 public referralFeePercent = 2;
    uint256 public basicStoreFee = 0.001 ether;
    uint256 public proStoreFee  = 0.003 ether;

    uint256 public totalItems;

    uint256 private constant FREE_TIER_LIMIT  = 10;
    uint256 private constant STORE_DURATION   = 365 days;

    struct Item {
        uint256         id;
        string          itemName;
        uint256         price;
        string          category;
        string          trackingCode;
        address payable seller;
        address payable buyer;
        address payable referrer;
        bool            isSold;
        bool            isDelivered;
        bool            isRefunded;
        bool            isActive;
        uint256         stock;
    }

    struct Store {
        string   storeName;
        uint256  expiresAt;
        uint8    tier;
        uint256  productCount;
    }

    mapping(uint256 => Item)    public items;
    mapping(address => Store)   public stores;
    mapping(uint256 => uint256) private escrow;

    // ── Events ──────────────────────────────────────────────────────────────
    event ItemListed(uint256 indexed id, string itemName, uint256 price, address indexed seller);
    event ItemBought(uint256 indexed id, address indexed buyer);
    event ItemCancelled(uint256 indexed id);
    event DeliveryConfirmed(uint256 indexed id, address liberadoPor);
    event RefundIssued(uint256 indexed id);
    event ItemBanned(uint256 indexed id);
    event StoreCreated(address indexed owner, string storeName, uint8 tier);
    event StoreUpgraded(address indexed owner);
    event TrackingAdded(uint256 indexed id, string trackingCode);

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner()  { require(msg.sender == owner,  "Not owner");       _; }
    modifier notPaused()  { require(!paused,              "Contract paused"); _; }

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
        bool isAdmin = (msg.sender == owner);
        if (!isAdmin) {
            uint256 fee = _isPro ? proStoreFee : basicStoreFee;
            require(msg.value >= fee, "Insufficient store fee");
            if (fee > 0) owner.transfer(fee);
            if (msg.value > fee) payable(msg.sender).transfer(msg.value - fee);
        } else {
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
        }
        stores[msg.sender] = Store({
            storeName:    _name,
            expiresAt:    block.timestamp + STORE_DURATION,
            tier:         _isPro ? 1 : 0,
            productCount: 0
        });
        emit StoreCreated(msg.sender, _name, _isPro ? 1 : 0);
    }

    function renewStore() external payable notPaused {
        Store storage s = stores[msg.sender];
        require(bytes(s.storeName).length > 0, "No store registered");
        bool isAdmin = (msg.sender == owner);
        if (!isAdmin) {
            uint256 fee = s.tier == 1 ? proStoreFee : basicStoreFee;
            require(msg.value >= fee, "Insufficient store fee");
            if (fee > 0) owner.transfer(fee);
            if (msg.value > fee) payable(msg.sender).transfer(msg.value - fee);
        } else {
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
        }
        if (s.expiresAt > block.timestamp) {
            s.expiresAt += STORE_DURATION;
        } else {
            s.expiresAt = block.timestamp + STORE_DURATION;
        }
    }

    function upgradeToPro() external payable notPaused {
        Store storage s = stores[msg.sender];
        require(bytes(s.storeName).length > 0, "No store registered");
        require(s.tier == 0, "Already pro");
        bool isAdmin = (msg.sender == owner);
        if (!isAdmin) {
            uint256 diff = proStoreFee > basicStoreFee ? proStoreFee - basicStoreFee : proStoreFee;
            require(msg.value >= diff, "Insufficient upgrade fee");
            if (diff > 0) owner.transfer(diff);
            if (msg.value > diff) payable(msg.sender).transfer(msg.value - diff);
        } else {
            if (msg.value > 0) payable(msg.sender).transfer(msg.value);
        }
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
        Store storage s = stores[msg.sender];
        // Subscription / registration checks — disabled for v3 open testing
        // require(bytes(s.storeName).length > 0, "No store registered");
        // require(s.expiresAt >= block.timestamp, "Store subscription expired");

        if (msg.sender != owner && s.tier == 0) {
            // Free-tier cap disabled during open testing
            // require(s.productCount < FREE_TIER_LIMIT, "Free tier limit: max 10 products");
        }

        totalItems++;
        items[totalItems] = Item({
            id:           totalItems,
            itemName:     _itemName,
            price:        _price,
            category:     _category,
            trackingCode: "",
            seller:       payable(msg.sender),
            buyer:        payable(address(0)),
            referrer:     payable(address(0)),
            isSold:       false,
            isDelivered:  false,
            isRefunded:   false,
            isActive:     true,
            stock:        _stock
        });
        s.productCount++;
        emit ItemListed(totalItems, _itemName, _price, msg.sender);
    }

    // ── Purchase (ETH escrow) ─────────────────────────────────────────────────
    function buyItem(uint256 _id, address payable _referrer) external payable notPaused {
        Item storage item = items[_id];
        require(item.isActive,      "Item not active");
        require(!item.isSold,       "Already sold");
        require(item.stock > 0,     "Produto esgotado");
        require(msg.value >= item.price, "Insufficient payment");

        if (msg.sender != owner) {
            require(msg.sender != item.seller, "Cannot buy own item");
        }

        // ── Fee math ────────────────────────────────────────────────────────
        // Owner/admin pays zero platform fee — avoids self-transfer and keeps
        // the full item price in escrow for the seller.
        uint256 platFee = (msg.sender != owner)
            ? (item.price * platformFeePercent) / 100
            : 0;
        bool validRef = (
            _referrer != address(0) &&
            _referrer != item.seller &&
            _referrer != msg.sender
        );
        uint256 refFee   = validRef ? (item.price * referralFeePercent) / 100 : 0;
        uint256 escrowed = item.price - platFee - refFee;

        if (platFee > 0) {
            owner.transfer(platFee);
        }
        if (refFee > 0 && validRef) {
            _referrer.transfer(refFee);
        }
        if (msg.value > item.price) {
            payable(msg.sender).transfer(msg.value - item.price);
        }

        escrow[_id] = escrowed;

        // Decrement stock; mark sold out when stock reaches 0
        item.stock--;
        if (item.stock == 0) {
            item.isSold   = true;
            item.isActive = false;
        }
        item.buyer    = payable(msg.sender);
        item.referrer = _referrer;

        emit ItemBought(_id, msg.sender);
    }

    // ── Escrow release ────────────────────────────────────────────────────────
    function confirmDelivery(uint256 _id) external {
        Item storage item = items[_id];
        require(item.isSold && !item.isDelivered && !item.isRefunded, "Invalid state");
        require(msg.sender == item.buyer || msg.sender == owner, "Not buyer or admin");

        item.isDelivered = true;
        uint256 amt = escrow[_id];
        escrow[_id] = 0;
        if (amt > 0) item.seller.transfer(amt);

        emit DeliveryConfirmed(_id, msg.sender);
    }

    function refundBuyer(uint256 _id) external {
        Item storage item = items[_id];
        require(item.isSold && !item.isDelivered && !item.isRefunded, "Invalid state");
        require(msg.sender == item.seller || msg.sender == owner, "Not seller or admin");

        item.isRefunded = true;
        uint256 amt = escrow[_id];
        escrow[_id] = 0;
        if (amt > 0) item.buyer.transfer(amt);

        emit RefundIssued(_id);
    }

    // ── Item management ───────────────────────────────────────────────────────
    function cancelItem(uint256 _id) external {
        Item storage item = items[_id];
        require(!item.isSold, "Already sold");
        require(msg.sender == item.seller || msg.sender == owner, "Not seller or admin");
        item.isActive = false;
        emit ItemCancelled(_id);
    }

    function banItem(uint256 _id) external onlyOwner {
        items[_id].isActive = false;
        emit ItemBanned(_id);
    }

    function setTrackingCode(uint256 _id, string calldata _trackingCode) external {
        Item storage item = items[_id];
        require(msg.sender == item.seller || msg.sender == owner, "Not seller or admin");
        item.trackingCode = _trackingCode;
        emit TrackingAdded(_id, _trackingCode);
    }
}
