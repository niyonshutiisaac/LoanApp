import "dotenv/config";
import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const day = (offset: number, hour = 10) => dayjs().add(offset, "day").hour(hour).minute(0).second(0).toDate();
const dayDate = (offset: number) => dayjs().add(offset, "day").format("YYYY-MM-DD");

async function main() {
  console.log("Seeding demo data...");

  const shop = await prisma.shop.create({
    data: {
      name: "ABC Shop",
      phone: "+250788000000",
      address: "Main Market, Kigali",
      currency: "RWF",
      timezone: "Africa/Kigali",
    },
  });

  await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "Demo Owner",
      email: "demo@loanapp.com",
      phone: "+250780000000",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const customerSeed: [string, string, string, number, number | null][] = [
    ["John", "+250781111111", "Remera", 45000, -3],
    ["Peter", "+250782222222", "Nyamirambo", 25000, 0],
    ["David", "+250783333333", "Kicukiro", 10000, 5],
    ["Alice", "+250784444444", "Gisozi", 60000, -1],
    ["Grace", "+250785555555", "Kimironko", 0, null],
    ["Emmanuel", "+250786666666", "Kabuga", 0, null],
  ];

  const customers = [];
  for (const [name, phone, address, balance, dueOffset] of customerSeed) {
    const paid = balance > 0 ? Math.round(balance * 2.7) : 10000;
    const bought = balance + paid;
    const customer = await prisma.customer.create({ data: { shopId: shop.id, name, phone, address } });
    customers.push(customer);

    if (bought > 0) {
      await prisma.customerLedgerEntry.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          type: "SALE",
          description: `Bought goods on credit (${name})`,
          amount: bought.toFixed(2),
          direction: "IN",
          createdAt: day(-20, 12),
        },
      });
    }
    if (paid > 0) {
      await prisma.customerLedgerEntry.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          type: "CUSTOMER_PAYMENT",
          description: "Cash payment",
          amount: paid.toFixed(2),
          direction: "OUT",
          createdAt: day(-6, 16),
        },
      });
    }
    if (balance > 0 && dueOffset !== null) {
      await prisma.sale.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          paymentType: "CREDIT",
          totalAmount: balance.toFixed(2),
          paidAmount: "0.00",
          remainingAmount: balance.toFixed(2),
          dueDate: new Date(dayDate(dueOffset)),
          soldAt: day(-20, 12),
          items: { create: [{ productName: "Assorted goods", quantity: 1, unitPrice: balance.toFixed(2), total: balance.toFixed(2) }] },
        },
      });
    }
  }

  const productSeed: [string, string, string, number, number, number, number][] = [
    ["Sugar", "SUG-001", "kg", 4000, 5000, 24, 10],
    ["Rice", "RIC-001", "kg", 3500, 4500, 18, 10],
    ["Cooking Oil", "OIL-001", "liter", 7000, 8500, 15, 6],
    ["Salt", "SAL-001", "pack", 500, 700, 40, 12],
    ["Bathing Soap", "SOAP-01", "piece", 1200, 1500, 30, 10],
    ["Maize Flour", "MAI-001", "kg", 2500, 3000, 8, 8],
    ["Bottled Water", "WAT-001", "bottle", 400, 600, 96, 24],
    ["Milk", "MIL-001", "liter", 900, 1300, 0, 6],
  ];

  const products = [];
  for (const [name, sku, unit, buying, selling, stock, threshold] of productSeed) {
    products.push(
      await prisma.product.create({
        data: {
          shopId: shop.id,
          name,
          sku,
          unit,
          buyingPrice: buying.toFixed(2),
          sellingPrice: selling.toFixed(2),
          stockQuantity: stock,
          lowStockThreshold: threshold,
        },
      }),
    );
  }
  const [sugar, rice, oil, , , flour, water, milk] = products;

  await prisma.sale.create({
    data: {
      shopId: shop.id,
      paymentType: "CASH",
      totalAmount: "11800.00",
      paidAmount: "11800.00",
      remainingAmount: "0.00",
      soldAt: day(0, 9),
      items: {
        create: [
          { productId: sugar.id, productName: sugar.name, quantity: 2, unitPrice: "5000.00", total: "10000.00" },
          { productId: water.id, productName: water.name, quantity: 3, unitPrice: "600.00", total: "1800.00" },
        ],
      },
    },
  });

  await prisma.purchase.create({
    data: {
      shopId: shop.id,
      totalAmount: "97000.00",
      paymentAmount: "97000.00",
      remainingAmount: "0.00",
      paymentStatus: "PAID",
      purchasedAt: day(-7, 7),
      items: {
        create: [
          { productId: sugar.id, productName: sugar.name, quantity: 5, unitCost: "4000.00", total: "20000.00" },
          { productId: rice.id, productName: rice.name, quantity: 10, unitCost: "3500.00", total: "35000.00" },
          { productId: oil.id, productName: oil.name, quantity: 6, unitCost: "7000.00", total: "42000.00" },
        ],
      },
    },
  });

  await prisma.expense.createMany({
    data: [
      { shopId: shop.id, category: "Transport", description: "Delivery of goods", amount: "5000.00", expenseDate: day(0, 7) },
      { shopId: shop.id, category: "Electricity", amount: "15000.00", expenseDate: day(-4, 16) },
      { shopId: shop.id, category: "Rent", description: "Monthly shop rent", amount: "100000.00", expenseDate: day(-1, 9) },
    ],
  });

  void milk;
  void flour;
  console.log(`Seed complete. Demo login: demo@loanapp.com / demo1234 (shop: ${shop.name})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
