import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuthStore } from "./store/useAuthStore";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Telephony from "./pages/Telephony";
import Reports from "./pages/Reports";
import Contactbook from "./pages/Contactbook";
import Incomingcallrouting from "./pages/Incomingcallrouting";
import Outgoingreport from "./pages/reports/Outgoingreport";
import Incomingreport from "./pages/reports/Incomingreport";
import CallingBar from "./components/CallingBar";

import Table from "./components/TableOld";

import Tablee from "./components/Table";
import Error from "./pages/Error";
import Break from "./pages/Break";
import ConversationPage from "./pages/ConversationPage";

const columns = [
  { title: "Name", key: "name" },
  { title: "Email", key: "email" },
  { title: "Department", key: "dept" },
  { title: "Phone", key: "phone" },

  { title: "Status", key: "status" },
  { title: "Status 2", key: "status2" },
];

const data = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    dept: "HR",
    phone: "1234567890",
    status: "active",
    status2: "active",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    dept: "Marketing",
    phone: "2345678901",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Alice Johnson",
    email: "alice.j@example.com",
    dept: "Finance",
    phone: "3456789012",
    status: "active",
    status2: "active",
  },
  {
    name: "Bob Brown",
    email: "bob.b@example.com",
    dept: "IT",
    phone: "4567890123",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Charlie Green",
    email: "charlie.g@example.com",
    dept: "Sales",
    phone: "5678901234",
    status: "active",
    status2: "active",
  },
  {
    name: "Daisy White",
    email: "daisy.w@example.com",
    dept: "Legal",
    phone: "6789012345",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ethan Blue",
    email: "ethan.b@example.com",
    dept: "Operations",
    phone: "7890123456",
    status: "active",
    status2: "active",
  },
  {
    name: "Fiona Black",
    email: "fiona.black@example.com",
    dept: "Procurement",
    phone: "8901234567",
    status: "active",
    status2: "active",
  },
  {
    name: "George Violet",
    email: "george.v@example.com",
    dept: "Support",
    phone: "9012345678",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Hannah Gray",
    email: "hannah.g@example.com",
    dept: "Engineering",
    phone: "0123456789",
    status: "active",
    status2: "active",
  },
  {
    name: "Ian Gold",
    email: "ian.gold@example.com",
    dept: "IT",
    phone: "1122334455",
    status: "active",
    status2: "active",
  },
  {
    name: "Julia Rose",
    email: "julia.rose@example.com",
    dept: "Finance",
    phone: "2233445566",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Kevin Stone",
    email: "kevin.stone@example.com",
    dept: "HR",
    phone: "3344556677",
    status: "active",
    status2: "active",
  },
  {
    name: "Lena Silver",
    email: "lena.silver@example.com",
    dept: "Marketing",
    phone: "4455667788",
    status: "active",
    status2: "active",
  },
  {
    name: "Mason Iron",
    email: "mason.iron@example.com",
    dept: "Support",
    phone: "5566778899",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Nina Copper",
    email: "nina.copper@example.com",
    dept: "Sales",
    phone: "6677889900",
    status: "active",
    status2: "active",
  },
  {
    name: "Oscar Zinc",
    email: "oscar.zinc@example.com",
    dept: "Operations",
    phone: "7788990011",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Paula Lead",
    email: "paula.lead@example.com",
    dept: "Legal",
    phone: "8899001122",
    status: "active",
    status2: "active",
  },
  {
    name: "Quinn Mercury",
    email: "quinn.merc@example.com",
    dept: "IT",
    phone: "9900112233",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Rachel Neon",
    email: "rachel.neon@example.com",
    dept: "Finance",
    phone: "1011121314",
    status: "active",
    status2: "active",
  },
  {
    name: "Steve Krypton",
    email: "steve.k@example.com",
    dept: "HR",
    phone: "1213141516",
    status: "active",
    status2: "active",
  },
  {
    name: "Tina Argon",
    email: "tina.a@example.com",
    dept: "Marketing",
    phone: "1314151617",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Uma Xenon",
    email: "uma.x@example.com",
    dept: "Legal",
    phone: "1415161718",
    status: "active",
    status2: "active",
  },
  {
    name: "Victor Helium",
    email: "victor.h@example.com",
    dept: "Sales",
    phone: "1516171819",
    status: "active",
    status2: "active",
  },
  {
    name: "Wendy Radon",
    email: "wendy.r@example.com",
    dept: "Operations",
    phone: "1617181920",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Xander Boron",
    email: "xander.b@example.com",
    dept: "IT",
    phone: "1718192021",
    status: "active",
    status2: "active",
  },
  {
    name: "Yara Fluorine",
    email: "yara.f@example.com",
    dept: "Support",
    phone: "1819202122",
    status: "active",
    status2: "active",
  },
  {
    name: "Zach Lithium",
    email: "zach.l@example.com",
    dept: "Engineering",
    phone: "1920212223",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ava Carbon",
    email: "ava.c@example.com",
    dept: "Legal",
    phone: "2021222324",
    status: "active",
    status2: "active",
  },
  {
    name: "Ben Oxygen",
    email: "ben.o@example.com",
    dept: "Finance",
    phone: "2122232425",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Cara Nitrogen",
    email: "cara.n@example.com",
    dept: "Marketing",
    phone: "2223242526",
    status: "active",
    status2: "active",
  },
  {
    name: "Dan Hydrogen",
    email: "dan.h@example.com",
    dept: "Engineering",
    phone: "2324252627",
    status: "active",
    status2: "active",
  },
  {
    name: "Ella Bismuth",
    email: "ella.b@example.com",
    dept: "IT",
    phone: "2425262728",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Fred Gallium",
    email: "fred.g@example.com",
    dept: "Support",
    phone: "2526272829",
    status: "active",
    status2: "active",
  },
  {
    name: "Gina Indium",
    email: "gina.i@example.com",
    dept: "Legal",
    phone: "2627282930",
    status: "active",
    status2: "active",
  },
  {
    name: "Hank Thallium",
    email: "hank.t@example.com",
    dept: "Sales",
    phone: "2728293031",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Isla Tin",
    email: "isla.t@example.com",
    dept: "Operations",
    phone: "2829303132",
    status: "active",
    status2: "active",
  },
  {
    name: "Jake Lead",
    email: "jake.l@example.com",
    dept: "HR",
    phone: "2930313233",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Kara Nickel",
    email: "kara.n@example.com",
    dept: "Finance",
    phone: "3031323334",
    status: "active",
    status2: "active",
  },
  {
    name: "Leo Cobalt",
    email: "leo.c@example.com",
    dept: "Marketing",
    phone: "3132333435",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Maya Zinc",
    email: "maya.z@example.com",
    dept: "IT",
    phone: "3233343536",
    status: "active",
    status2: "active",
  },
  {
    name: "Noah Iron",
    email: "noah.i@example.com",
    dept: "Support",
    phone: "3334353637",
    status: "active",
    status2: "active",
  },
  {
    name: "Olivia Silver",
    email: "olivia.s@example.com",
    dept: "Engineering",
    phone: "3435363738",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Paul Bronze",
    email: "paul.b@example.com",
    dept: "Legal",
    phone: "3536373839",
    status: "active",
    status2: "active",
  },
  {
    name: "Queenie Platinum",
    email: "queenie.p@example.com",
    dept: "Sales",
    phone: "3637383940",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ravi Copper",
    email: "ravi.c@example.com",
    dept: "Procurement",
    phone: "3738394041",
    status: "active",
    status2: "active",
  },
  {
    name: "Sara Steel",
    email: "sara.s@example.com",
    dept: "HR",
    phone: "3840414243",
    status: "active",
    status2: "active",
  },
  {
    name: "Tom Brass",
    email: "tom.b@example.com",
    dept: "Finance",
    phone: "3941424344",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ursula Gold",
    email: "ursula.g@example.com",
    dept: "Marketing",
    phone: "4042434445",
    status: "active",
    status2: "active",
  },
  {
    name: "Vince Titanium",
    email: "vince.t@example.com",
    dept: "IT",
    phone: "4143444546",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Willa Chromium",
    email: "willa.c@example.com",
    dept: "Sales",
    phone: "4244454647",
    status: "active",
    status2: "active",
  },
  {
    name: "Xavier Manganese",
    email: "xavier.m@example.com",
    dept: "Engineering",
    phone: "4345464748",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Yvonne Vanadium",
    email: "yvonne.v@example.com",
    dept: "Legal",
    phone: "4446474849",
    status: "active",
    status2: "active",
  },
  {
    name: "Zane Nickel",
    email: "zane.n@example.com",
    dept: "HR",
    phone: "4547484950",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Amelia Cobalt",
    email: "amelia.c@example.com",
    dept: "Finance",
    phone: "4648495051",
    status: "active",
    status2: "active",
  },
  {
    name: "Brian Copper",
    email: "brian.c@example.com",
    dept: "Support",
    phone: "4749505152",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Clara Zinc",
    email: "clara.z@example.com",
    dept: "Operations",
    phone: "4850515253",
    status: "active",
    status2: "active",
  },
  {
    name: "Derek Iron",
    email: "derek.i@example.com",
    dept: "Procurement",
    phone: "4951525354",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Elise Silver",
    email: "elise.s@example.com",
    dept: "Marketing",
    phone: "5052535455",
    status: "active",
    status2: "active",
  },
  {
    name: "Finn Bronze",
    email: "finn.b@example.com",
    dept: "IT",
    phone: "5153545556",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Gwen Platinum",
    email: "gwen.p@example.com",
    dept: "Sales",
    phone: "5254555657",
    status: "active",
    status2: "active",
  },
  {
    name: "Hugo Steel",
    email: "hugo.s@example.com",
    dept: "HR",
    phone: "5355565758",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Iris Brass",
    email: "iris.b@example.com",
    dept: "Finance",
    phone: "5456575859",
    status: "active",
    status2: "active",
  },
  {
    name: "Jasper Gold",
    email: "jasper.g@example.com",
    dept: "Engineering",
    phone: "5557585960",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Kylie Titanium",
    email: "kylie.t@example.com",
    dept: "Legal",
    phone: "5658596061",
    status: "active",
    status2: "active",
  },
  {
    name: "Liam Chromium",
    email: "liam.c@example.com",
    dept: "Support",
    phone: "5759606162",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Mia Manganese",
    email: "mia.m@example.com",
    dept: "Operations",
    phone: "5860616263",
    status: "active",
    status2: "active",
  },
  {
    name: "Nolan Vanadium",
    email: "nolan.v@example.com",
    dept: "IT",
    phone: "5961626364",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Opal Nickel",
    email: "opal.n@example.com",
    dept: "Marketing",
    phone: "6062636465",
    status: "active",
    status2: "active",
  },
  {
    name: "Preston Cobalt",
    email: "preston.c@example.com",
    dept: "Sales",
    phone: "6163646566",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Quinn Copper",
    email: "quinn.c@example.com",
    dept: "HR",
    phone: "6264656667",
    status: "active",
    status2: "active",
  },
  {
    name: "Rhea Zinc",
    email: "rhea.z@example.com",
    dept: "Finance",
    phone: "6365666768",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Silas Iron",
    email: "silas.i@example.com",
    dept: "Engineering",
    phone: "6466676869",
    status: "active",
    status2: "active",
  },
  {
    name: "Tara Silver",
    email: "tara.s@example.com",
    dept: "Legal",
    phone: "6567686970",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ulysses Bronze",
    email: "ulysses.b@example.com",
    dept: "Support",
    phone: "6668697071",
    status: "active",
    status2: "active",
  },
  {
    name: "Vera Platinum",
    email: "vera.p@example.com",
    dept: "Operations",
    phone: "6769707172",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Wyatt Steel",
    email: "wyatt.s@example.com",
    dept: "IT",
    phone: "6870717273",
    status: "active",
    status2: "active",
  },
  {
    name: "Xena Brass",
    email: "xena.b@example.com",
    dept: "Marketing",
    phone: "6971727374",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Yuri Gold",
    email: "yuri.g@example.com",
    dept: "HR",
    phone: "7072737475",
    status: "active",
    status2: "active",
  },
  {
    name: "Zoe Titanium",
    email: "zoe.t@example.com",
    dept: "Finance",
    phone: "7173747576",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Adam Chromium",
    email: "adam.c@example.com",
    dept: "Sales",
    phone: "7274757677",
    status: "active",
    status2: "active",
  },
  {
    name: "Bella Manganese",
    email: "bella.m@example.com",
    dept: "Engineering",
    phone: "7375767778",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Caleb Vanadium",
    email: "caleb.v@example.com",
    dept: "Legal",
    phone: "7476777879",
    status: "active",
    status2: "active",
  },
  {
    name: "Dina Nickel",
    email: "dina.n@example.com",
    dept: "Support",
    phone: "7577787980",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Evan Cobalt",
    email: "evan.c@example.com",
    dept: "Operations",
    phone: "7678798081",
    status: "active",
    status2: "active",
  },
  {
    name: "Faye Copper",
    email: "faye.c@example.com",
    dept: "IT",
    phone: "7779808182",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Gabe Zinc",
    email: "gabe.z@example.com",
    dept: "Marketing",
    phone: "7880818283",
    status: "active",
    status2: "active",
  },
  {
    name: "Hazel Iron",
    email: "hazel.i@example.com",
    dept: "HR",
    phone: "7981828384",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Ivan Silver",
    email: "ivan.s@example.com",
    dept: "Finance",
    phone: "8082838485",
    status: "active",
    status2: "active",
  },
  {
    name: "Jade Bronze",
    email: "jade.b@example.com",
    dept: "Engineering",
    phone: "8183848586",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Kieran Platinum",
    email: "kieran.p@example.com",
    dept: "Sales",
    phone: "8284858687",
    status: "active",
    status2: "active",
  },
  {
    name: "Lila Steel",
    email: "lila.s@example.com",
    dept: "Legal",
    phone: "8385868788",
    status: "inactive",
    status2: "inactive",
  },
  {
    name: "Miles Brass",
    email: "miles.b@example.com",
    dept: "Support",
    phone: "8486878889",
    status: "active",
    status2: "active",
  },
  {
    name: "Nia Gold",
    email: "nia.g@example.com",
    dept: "Operations",
    phone: "8587888980",
    status: "inactive",
    status2: "inactive",
  },
];

const handleSelection = (selectedRows) => {
  console.log("Selected Rows:", selectedRows);
};

function App() {
  const { authUser } = useAuthStore();

  return (
    <div className="App">
      {/* <Tablee
      columns={columns}
      data={data}
      pageSize={10}
      pagination={true}
      selectable={false}
      sortable={false}
      searchable={false}
      // loading={true}
      showtotal={false}
      onSelectChange={handleSelection}
    /> */}
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/break" element={<Break />} />
          {/* <Route path="/conversation" element={<ConversationPage/>}/> */}

          {/* <Route path="/callingbar" element={<CallingBar />} /> */}

          <Route
            path="/*"
            element={
              authUser ? (
                <Layout>
                  <Routes>
                    <Route
                      path="/conversation"
                      element={<ConversationPage />}
                    />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/telephony" element={<Telephony />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/contactbook" element={<Contactbook />} />
                    <Route
                      path="/incoming-report"
                      element={<Incomingreport />}
                    />
                    <Route
                      path="/outgoing-report"
                      element={<Outgoingreport />}
                    />
                    <Route
                      path="/incomingcallrouting"
                      element={<Incomingcallrouting />}
                    />
                    <Route path="error" element={<Error />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="*" element={<Error />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
