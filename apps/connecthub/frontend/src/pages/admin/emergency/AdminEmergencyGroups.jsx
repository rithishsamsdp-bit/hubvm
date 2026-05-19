import React from "react";
import { Users, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminEmergencyGroups = ({
  groups,
  handleViewContacts,
  handleDeleteGroup,
}) => (
  <div className="w-full h-full p-6 bg-slate-50/50 overflow-y-auto">
    <div className="mb-6">
      <h3 className="text-xl font-black text-slate-800">Contact Groups</h3>
      <p className="text-sm font-medium text-slate-500 mt-1">
        Manage your pre-defined recipient lists for instant deployment.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {groups.length > 0 ? (
        groups.map((group) => (
          <div
            key={group.id}
            className="group relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-4"
            onClick={() => handleViewContacts(group)}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#ff5200]" />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewContacts(group);
                  }}
                  title="View Contacts"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800 line-clamp-1 mb-1 group-hover:text-[#ff5200] transition-colors">
                {group.name}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                {group.contactCount} Contacts
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            No Contact Groups Found
          </h3>
          <p className="text-sm font-medium text-slate-400 text-center max-w-sm">
            Create a contact group to manage your pre-defined recipient lists for
            instant deployment.
          </p>
        </div>
      )}
    </div>
  </div>
);

export default AdminEmergencyGroups;
