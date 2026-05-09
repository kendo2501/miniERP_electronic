Các yêu cầu của từng module và role của project ERP doanh nghiệp phân phối thiết bị điện



Các role cần có

director

accountant

warehouse\_manager

sales\_staff

purchaser (nhân viên mua hàng)

Customer (đặt đơn hàng)



\*\*MODULE 1: PRODUCT\*\*



Chức năng cần làm:



\*\*1.1. Quản lý danh mục sản phẩm (Category)\*\*

CRUD danh mục (cây - tree structure)

Import/Export danh mục từ Excel

Tìm kiếm danh mục



\*\*1.2. Quản lý sản phẩm (Product)\*\*

CRUD sản phẩm

Quản lý thuộc tính động (attributes JSON) cho từng loại sản phẩm

Upload ảnh sản phẩm (multiple images)

Quản lý đơn vị tính (UoM) và chuyển đổi

Tìm kiếm sản phẩm nâng cao (theo thương hiệu, công suất, tiết diện...)

Import/Export sản phẩm từ Excel



\*\*1.3. Quản lý giá (Price Management)\*\*

Tạo bảng giá (Price List)

Gán giá theo:

Cấp đại lý

Số lượng mua (tiered pricing)

Khách hàng cụ thể

Lịch sử thay đổi giá

Áp dụng giá theo thời gian (valid from - to)



\*\*1.4. API cho module khác gọi\*\*

Lấy thông tin sản phẩm (có cache)

Tính giá cho khách hàng (gọi từ Sales)

Kiểm tra sản phẩm tồn tại

Phụ thuộc: Không phụ thuộc module nào khác





\*\*MODULE 2: PARTNER\*\*



Chức năng cần làm:



\*\*2.1. Quản lý loại đối tác\*\*

Khách hàng (Customer)

Nhà cung cấp (Supplier)

Đối tác vừa mua vừa bán



\*\*2.2. Quản lý khách hàng (Customer)\*\*

CRUD thông tin khách hàng

Phân cấp đại lý (Cấp 1, Cấp 2, CTV...)

Quản lý nhiều địa chỉ nhận hàng

Quản lý người liên hệ (contact persons)

Lịch sử giao dịch

Import/Export từ Excel



\*\*2.3. Quản lý nhà cung cấp (Supplier)\*\*

CRUD nhà cung cấp

Đánh giá nhà cung cấp (rating)

Lịch sử mua hàng

Hợp đồng khung



\*\*2.4. Quản lý hạn mức tín dụng (Credit Limit)\*\*

Thiết lập hạn mức theo khách hàng

Theo dõi dư nợ hiện tại

Tính hạn mức khả dụng

Lịch sử thay đổi hạn mức

Cảnh báo khi vượt hạn mức



\*\*2.5. API cho module khác gọi\*\*

Kiểm tra hạn mức trước khi tạo đơn (Sales)

Lấy thông tin khách hàng (Sales, Finance)

Lấy thông tin nhà cung cấp (Purchase)

Phụ thuộc: Product (để lấy lịch sử mua hàng)



Thời gian: 2.5 tuần (làm sau Product 1 tuần)



\*\*MODULE 3: INVENTORY (UPDATED)\*\*



Chức năng cần làm:



\*\*3.0. Inventory Ledger\*\*

Thiết kế bảng inventory\\\_moves (append-only)

Ghi nhận tất cả biến động kho:

Nhập kho (từ Purchase)

Xuất kho (từ Sales)

Trả hàng

Điều chỉnh kiểm kê

KHÔNG cho phép UPDATE/DELETE (immutability)

Tính tồn kho bằng cách SUM từ inventory\\\_moves

Có thể dùng bảng stock\\\_balance làm cache (optional)



\*\*3.1. Quản lý kho (Warehouse)\*\*

CRUD kho (mã kho, tên kho, địa chỉ)

Phân loại kho (kho tổng, kho trung chuyển)

Quản lý vị trí trong kho (locations)



\*\*3.2. Quản lý tồn kho\*\*

Xem tồn kho theo sản phẩm, theo kho

Xem tồn kho theo lô (batch) (optional)

Xem lịch sử nhập/xuất (từ inventory\\\_moves)



Tính tồn kho:

\- total\\\_qty = SUM(moves)

\- reserved\\\_qty

\- available\\\_qty = total - reserved



\*\*3.3. Nhập kho (Receiving)\*\*

KHÔNG update tồn kho trực tiếp

Khi nhận hàng:

\- nhận event GoodsReceivedEvent

\- tạo inventory\\\_moves (+qty)

In phiếu nhập kho



\*\*3.4. Xuất kho (Issuing)\*\*

KHÔNG trừ tồn kho trực tiếp

Khi giao hàng:

\- nhận event DeliveryCreatedEvent

\- tạo inventory\\\_moves (-qty)

In phiếu xuất kho



\*\*3.5. Đặt hàng trước (Reservation)\*\*

Giữ hàng khi tạo đơn bán

\- reserved\\\_qty (hàng đã giữ)

\- available\\\_qty = total - reserved

Tự động hủy giữ nếu quá hạn



\*\*3.6. Kiểm kê (Stock Count)\*\*

Tạo phiếu kiểm kê

Nhập số lượng thực tế

KHÔNG update tồn kho trực tiếp

Tạo Adjustment Move trong inventory\\\_moves

Có bước duyệt khi chênh lệch lớn



\*\*3.7. Báo cáo kho\*\*

Báo cáo tồn theo sản phẩm

Báo cáo nhập/xuất/tồn

Báo cáo hàng tồn lâu (aging)

Cảnh báo tồn tối thiểu



\*\*3.8. Event Handling\*\*

Subscribe các event:

GoodsReceivedEvent → tăng kho

DeliveryCreatedEvent → giảm kho

StockAdjustedEvent → điều chỉnh kho

Phụ thuộc: Product (thông tin sản phẩm)



\*\*MODULE 4: PURCHASE (UPDATED)\*\*



Chức năng cần làm:



\*\*4.1. Đề nghị mua hàng (Purchase Request)\*\*

Tạo đề nghị mua (tự động từ cảnh báo tồn kho)

Duyệt đề nghị mua

Chuyển thành đơn đặt hàng



\*\*4.2. Báo giá mua (Quotation từ NCC)\*\*

Gửi RFQ cho nhiều nhà cung cấp

Nhập báo giá

So sánh báo giá

Chọn nhà cung cấp



\*\*4.3. Đơn đặt hàng mua (Purchase Order)\*\*

Tạo PO từ RFQ hoặc đề nghị mua

CRUD PO (trước khi gửi)

Gửi PO (email/in)

Theo dõi trạng thái:

Draft

Sent

Partial

Completed

Cancelled

Lưu lịch sử thay đổi



\*\*4.4. Nhận hàng (Goods Receipt)\*\*

Tạo GRN từ PO

Nhận từng phần (partial receipt)

Đối chiếu với PO

KHÔNG cập nhật tồn kho trực tiếp

Emit event:

GoodsReceivedEvent



\*\*4.5. Hóa đơn mua (Purchase Invoice)\*\*

Nhập hóa đơn từ NCC

3-way matching:

PO

GRN

Invoice

Phát hiện mismatch (giá, số lượng)

Trình duyệt thanh toán



\*\*4.6. Báo cáo mua hàng\*\*

Báo cáo nhập hàng

Báo cáo công nợ NCC

Báo cáo hiệu suất NCC

Phụ thuộc: Product, Partner

(KHÔNG gọi trực tiếp Inventory)



\*\*MODULE 5: SALES (UPDATED)\*\*



Chức năng cần làm:



\*\*5.1. Báo giá bán (Quotation)\*\*

Tạo báo giá

Tính giá tự động:

\- cấp đại lý

\- số lượng

\- giá đặc biệt

Chiết khấu

Lưu version báo giá

Chuyển thành đơn hàng



\*\*5.2. Đơn hàng bán (Sales Order)\*\*

Tạo đơn hàng

Kiểm tra:

\- hạn mức tín dụng (Partner)

\- tồn kho (read-only từ Inventory)

\- Không được trừ kho trực tiếp

Giữ hàng (reserve stock)

Trạng thái:

Pending

Approved

Partial Delivery

Completed

Cancelled



\*\*5.3. Giao hàng (Delivery)\*\*

Lên lịch giao

Giao từng phần

Emit event:

DeliveryCreatedEvent

Inventory sẽ xử lý trừ kho



\*\*5.4. Trả lại hàng (Return)\*\*

Tạo đơn trả hàng

Kiểm tra điều kiện

Emit event:

StockReturnedEvent

Inventory tăng kho

Finance điều chỉnh công nợ



\*\*5.5. Pricing Snapshot (BẮT BUỘC)\*\*

Lưu giá tại thời điểm bán vào order line

Không phụ thuộc Product sau này



\*\*5.6. Idempotency (BẮT BUỘC)\*\*

API tạo đơn phải idempotent

Tránh tạo trùng đơn khi retry



\*\*5.7. Báo cáo bán hàng\*\*

Doanh số theo:

\- nhân viên

\- khách hàng

\- sản phẩm

Top sản phẩm

Theo thời gian

Phụ thuộc: Product, Partner

(KHÔNG gọi trực tiếp Inventory/Finance)



\*\*MODULE 6: FINANCE (UPDATED)\*\*



Chức năng cần làm:



\*\*6.1. Ledger (CORE - BẮT BUỘC)\*\*

Bảng ledger\\\_entries (append-only)

Ghi nhận tất cả giao dịch tài chính

KHÔNG cho UPDATE/DELETE



\*\*6.2. Công nợ phải thu (AR)\*\*

Tạo công nợ từ Sales (qua event)

Theo dõi:

\- số tiền

\- ngày đến hạn

\- đã thanh toán

\- còn lại

Báo cáo tuổi nợ



\*\*6.3. Công nợ phải trả (AP)\*\*

Tạo công nợ từ Purchase (qua event)

Theo dõi hóa đơn NCC

Báo cáo tuổi nợ



\*\*6.4. Thu tiền khách hàng\*\*

Ghi nhận phiếu thu

Phân bổ vào nhiều invoice

Bảng payment\\\_allocations

Đề xuất phân bổ FIFO



\*\*6.5. Trả tiền nhà cung cấp\*\*

Ghi nhận phiếu chi

Phân bổ thanh toán



\*\*6.6. Event Handling\*\*



Subscribe:

InvoiceCreatedEvent → tăng AR/AP

PaymentCreatedEvent → giảm AR/AP



6.7. Báo cáo tài chính

Công nợ khách

Công nợ NCC

Dòng tiền

Lợi nhuận:

Profit = Revenue - COGS



\*\*6.8. Idempotency\*\*

Payment API phải idempotent

Tránh ghi nhận trùng giao dịch

Phụ thuộc: Sales, Purchase (qua event)





\*\*Giải thích Event\*\*

Event-Driven Communication (BẮT BUỘC)

Các module KHÔNG gọi trực tiếp nhau

Giao tiếp qua event





**Here is the frontend requirement document for each role**



\# ERP System – Frontend Requirements by Role



This document describes what each user role needs to see and do in the system. Please design screens based on these requirements using the existing design system (blue theme, sidebar navigation, same components as the Partner module).



\---



\## ROLE 1: DIRECTOR (Giám đốc)



The Director needs a high-level overview of the entire business without detailed operational screens.



\*\*Dashboard Requirements:\*\*

\- A main dashboard showing key metrics for the whole company

\- Total revenue this month compared to last month

\- Total purchases this month

\- Current inventory value

\- Accounts receivable total (how much customers owe)

\- Accounts payable total (how much the company owes suppliers)

\- A chart showing revenue trend over the last 6 months

\- A chart showing top 5 selling products

\- A chart showing top 5 customers by purchase amount

\- Recent sales orders and purchase orders for quick viewing

\- Low stock alerts (products that need reordering)



\*\*Additional Screens:\*\*

\- View profit report (Revenue minus Cost of Goods Sold)

\- View cash flow report

\- View list of all users logged in recently

\- No edit permissions needed for any operational data



\---



\## ROLE 2: ACCOUNTANT (Kế toán)



The Accountant manages all financial transactions, receivables, payables, and payments.



\*\*Dashboard Requirements:\*\*

\- Overview of accounts receivable total

\- Overview of accounts payable total

\- Overdue payments from customers

\- Overdue payments to suppliers

\- Cash inflow and outflow chart for current month



\*\*Customer Receivables Screens:\*\*

\- List of all customers who owe money

\- For each customer: show total debt, overdue amount by days (1-30 days, 31-60 days, 61-90 days, over 90 days)

\- Click on a customer to see all their invoices

\- For each invoice: show invoice number, date, due date, amount, paid amount, remaining balance

\- Mark an invoice as paid and allocate payment to multiple invoices



\*\*Supplier Payables Screens:\*\*

\- List of all suppliers the company owes money to

\- For each supplier: show total debt, overdue amount by days

\- Click on a supplier to see all their purchase invoices

\- Record payment to a supplier and allocate to invoices



\*\*Payment Screens:\*\*

\- Create a receipt when a customer pays

&#x20; - Select customer from dropdown

&#x20; - Enter amount received

&#x20; - Choose which invoices this payment applies to

&#x20; - Enter payment date and reference number

\- Create a payment to a supplier

&#x20; - Select supplier from dropdown

&#x20; - Enter amount paid

&#x20; - Choose which purchase invoices this payment applies to



\*\*Reports Screens:\*\*

\- Aging report for customer debts (who owes how much and for how long)

\- Aging report for supplier debts

\- Cash flow statement

\- Profit and loss report



\---



\## ROLE 3: WAREHOUSE\_MANAGER (Trưởng kho)



The Warehouse Manager manages products, categories, inventory levels, stock movements, and price lists.



\*\*Product Management Screens:\*\*

\- Dashboard showing total products, total categories, low stock products, out of stock products

\- Category management screen with tree structure

&#x20; - Add, edit, delete categories

&#x20; - Drag and drop to change parent-child relationships

&#x20; - Import and export categories from Excel

&#x20; - Search for categories by name

\- Product list screen with advanced search filters

&#x20; - Filter by category, brand, power rating, price range, stock level

&#x20; - Table shows product code, image thumbnail, name, category, unit, selling price, current stock, status

&#x20; - Add new product button

&#x20; - Edit, delete, duplicate product actions

&#x20; - Import and export products from Excel

\- Product form screen using tabs:

&#x20; - General info tab: product code, name, category, description, upload multiple images with drag and drop

&#x20; - Unit conversion tab: base unit, display unit, conversion table (example: 1 box = 20 pieces)

&#x20; - Dynamic attributes tab: button to add attribute rows with name field and value field (example: Brand, Power, Size)

&#x20; - Price and stock tab: cost price, selling price, minimum stock alert level



\*\*Price List Management Screens:\*\*

\- List of all price lists showing name, who it applies to, validity period, whether it is default

\- Create new price list with:

&#x20; - Name

&#x20; - Apply to: all customers OR specific customer tier OR specific customer

&#x20; - Valid from and to dates (can be empty for no expiry)

&#x20; - Add products to price list with prices (use product selection popup)

\- For each price list, show price history with date, who changed it, old price, new price, reason



\*\*Inventory Management Screens:\*\*

\- Warehouse list screen: add, edit, delete warehouses (code, name, address, type)

\- Current stock screen:

&#x20; - View stock by product and by warehouse

&#x20; - Search and filter by product name, category, warehouse

&#x20; - Shows total quantity, reserved quantity, available quantity

\- Stock movement history screen: shows all inbound and outbound transactions with date, reference document, product, quantity, warehouse

\- Stock receipt screen:

&#x20; - Create receipt from purchase order

&#x20; - Select purchase order, confirm received quantities (partial receipt allowed)

&#x20; - Print receipt document

&#x20; - Automatically increases stock via backend events

\- Stock issue screen:

&#x20; - Create issue from sales order

&#x20; - Select sales order, confirm shipping quantities

&#x20; - Print issue document

&#x20; - Automatically decreases stock via backend events

\- Stock count screen:

&#x20; - Create stock count request for a warehouse

&#x20; - Enter actual counted quantities for each product

&#x20; - If difference is large, requires approval

&#x20; - After approval, creates adjustment movement

\- Stock reports:

&#x20; - Current stock by product report

&#x20; - Inbound and outbound summary by time period

&#x20; - Slow-moving stock report (products with no movement for X days)

&#x20; - Minimum stock alert list



\---



\## ROLE 4: SALES\_STAFF (Nhân viên bán hàng)



The Sales Staff sells products to customers, creates quotations, processes sales orders, and manages deliveries.



\*\*Dashboard Requirements:\*\*

\- Personal sales performance: total sales this month, number of orders processed

\- List of pending quotations that need attention

\- List of pending deliveries



\*\*Customer Management Screens (read-only from Partner module):\*\*

\- View customer list with basic info

\- Search customers by name, code, phone

\- Click customer to see their details including credit limit and current debt

\- View customer's purchase history

\- Cannot add, edit, or delete customers



\*\*Product Management Screens (read-only from Product module):\*\*

\- Search and view products with filters by category, brand, price range

\- See product details: name, code, current stock availability, selling price

\- Cannot add, edit, or delete products



\*\*Quotation Screens:\*\*

\- List of all quotations with status: draft, sent, converted, expired

\- Create new quotation:

&#x20; - Select customer

&#x20; - Add products using product search popup

&#x20; - Enter quantities

&#x20; - System automatically calculates price based on customer tier and price list

&#x20; - Apply discount if needed

&#x20; - View total amount

\- Save as draft or send to customer

\- Convert approved quotation to sales order



\*\*Sales Order Screens:\*\*

\- List of all sales orders with status: pending, approved, partially delivered, completed, cancelled

\- Create sales order from quotation

\- System automatically checks:

&#x20; - Customer credit limit (cannot create if exceeds)

&#x20; - Stock availability (shows available quantity)

\- Reserve stock when order is confirmed

\- View sales order details

\- Cancel order if needed (with reason)



\*\*Delivery Screens:\*\*

\- List of deliveries pending for each sales order

\- Create delivery schedule

\- Mark items as delivered (partial delivery allowed)

\- Print delivery note



\*\*Customer Return Screens:\*\*

\- Create return request for a delivered sales order

\- Select products to return

\- Enter reason for return

\- Submit for processing



\*\*Sales Reports:\*\*

\- My sales by product, by customer, by time period

\- Top selling products

\- Monthly sales summary



\---



\## ROLE 5: PURCHASER (Nhân viên mua hàng)



The Purchaser buys products from suppliers when stock is low. They work with suppliers to get quotes, create purchase orders, and receive goods.



\*\*Note:\*\* Yes, you understand correctly. The Purchaser buys equipment from manufacturers/suppliers when warehouse stock is low.



\*\*Dashboard Requirements:\*\*

\- Low stock alert showing products that need reordering (below minimum stock level)

\- Purchase requests that need action

\- Pending purchase orders that need to be sent to suppliers

\- Pending goods receipts



\*\*Supplier Management Screens (read-only from Partner module):\*\*

\- View supplier list with rating, total purchase amount

\- Search suppliers by name, code, product category

\- Click supplier to see details: contact info, purchase history, framework contracts

\- Cannot add, edit, or delete suppliers



\*\*Purchase Request Screens:\*\*

\- List of purchase requests with status: draft, pending approval, approved, converted

\- System can auto-generate purchase requests from low stock alerts

\- Create manual purchase request:

&#x20; - Select products and quantities needed

&#x20; - Add reason for purchase

\- Submit for approval

\- After approval, convert to purchase order



\*\*Request for Quotation (RFQ) Screens:\*\*

\- Create RFQ for products

\- Select multiple suppliers to send RFQ to

\- Enter product list with quantities

\- Send to suppliers

\- Enter supplier quotes when received:

&#x20; - For each supplier, enter price, delivery time, notes

\- Compare quotes side by side

\- Select winning supplier and create purchase order



\*\*Purchase Order Screens:\*\*

\- List of purchase orders with status: draft, sent, partially received, completed, cancelled

\- Create purchase order:

&#x20; - Select supplier

&#x20; - Add products with quantities

&#x20; - System shows suggested price (from previous purchases or price list)

&#x20; - Enter agreed price, delivery date, payment terms

\- Save as draft or send to supplier (email)

\- Track order status

\- View order history

\- Cancel order if needed



\*\*Goods Receipt Screens:\*\*

\- Create goods receipt from purchase order

\- Select purchase order, confirm received quantities (partial receipt allowed)

\- Enter batch numbers if applicable

\- Print receipt document

\- System emits event to increase inventory



\*\*Purchase Invoice Screens:\*\*

\- Enter supplier invoice when received

\- Match with purchase order and goods receipt (3-way matching)

\- System highlights mismatches in price or quantity

\- Submit for payment approval



\*\*Purchase Reports:\*\*

\- Purchase history by supplier, by product, by time period

\- Supplier performance report (on-time delivery rate, quality rating)

\- Purchase value by month chart



\---



\## ROLE 6: CUSTOMER (Khách hàng - Đặt đơn hàng)



The Customer is an external user who only places orders and views their own information. They do not access the main ERP dashboard.



\*\*Login Screen:\*\*

\- Customer login with email and password

\- Forgot password functionality



\*\*Customer Dashboard:\*\*

\- Welcome message with customer name

\- Customer tier and credit limit information

\- Current debt amount

\- Available credit remaining



\*\*Product Catalog Screen:\*\*

\- Browse products by category

\- Search and filter products (by name, brand, price range)

\- View product details: images, description, specifications, current price

\- See stock availability status



\*\*Shopping Cart Screen:\*\*

\- Add products to cart with quantities

\- View cart totals

\- Apply promotion codes if available

\- Proceed to checkout



\*\*Checkout Screen:\*\*

\- Confirm shipping address (can select from saved addresses or add new)

\- Select payment method

\- Review order summary including product prices, quantities, shipping fee, total amount

\- System checks credit limit before allowing order submission

\- Submit order



\*\*Order Management Screens:\*\*

\- List of my orders with status: pending, approved, processing, shipped, delivered, cancelled

\- Click order to see details:

&#x20; - Order date, order number

&#x20; - List of products with quantities and prices

&#x20; - Shipping address

&#x20; - Payment status

&#x20; - Delivery tracking information

\- Cancel order if status is still pending



\*\*Customer Profile Screen:\*\*

\- View and edit profile information (name, phone, email)

\- Manage shipping addresses (add, edit, delete)

\- Change password

\- View credit limit history



\*\*Order History:\*\*

\- View all past orders

\- Reorder from previous orders (add all items to cart with one click)

\- Download order invoices



\---



\## Module Ownership by Role



Here is a clear list showing what each role is responsible for:



\*\*Warehouse Manager is responsible for:\*\*

\- Product Management (creating and editing products, categories, attributes)

\- Price List Management (creating price lists and setting prices)

\- Inventory Management (warehouses, stock levels, receipts, issues, stock counts)



\*\*Sales Staff is responsible for:\*\*

\- Customer Management but only viewing customer information, cannot edit or delete

\- Sales Order and Quotation (creating quotations, sales orders, processing deliveries)



\*\*Purchaser is responsible for:\*\*

\- Supplier Management but only viewing supplier information, cannot edit or delete

\- Purchase Request and Order (creating purchase requests, getting quotes from suppliers, creating purchase orders, receiving goods)



\*\*Accountant is responsible for:\*\*

\- Accounts Receivable and Payment Collection (tracking customer debts, recording customer payments)

\- Accounts Payable and Payment to Suppliers (tracking supplier debts, recording payments to suppliers)



\*\*Director is responsible for:\*\*

\- Reports Dashboard (viewing company wide reports, revenue, profit, cash flow, top products, top customers)



\*\*Customer is responsible for:\*\*

\- Customer Portal (viewing products, placing orders, tracking their own orders, managing their profile)



\## Notes

Please design each role's screens as separate sections or pages in the Figma file. Use the existing blue theme, sidebar navigation, buttons, tables, modals, and form styles from the Partner module that has already been designed.



For common components like the product search popup, table with pagination, and confirmation dialog, create them once and reuse across all roles.



For forms with multiple sections, use tabs as shown in the CustomerForm example.



For charts and graphs, use Recharts library patterns.

