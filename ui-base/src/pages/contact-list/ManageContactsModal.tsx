import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { Loader2, Search, UserPlus, UserMinus } from "lucide-react";
import { contactService, contactListService } from "../../api";
import type { Contact, ContactList } from "../../api";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

interface ManageContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactList: ContactList | null;
  onSuccess: () => void;
}

export function ManageContactsModal({
  isOpen,
  onClose,
  contactList,
  onSuccess,
}: ManageContactsModalProps) {
  const [loading, setLoading] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [listContacts, setListContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  // Fetch all contacts and contacts in the list
  useEffect(() => {
    if (isOpen && contactList) {
      fetchData();
    }
  }, [isOpen, contactList]);

  const fetchData = async () => {
    if (!contactList) return;

    setLoading(true);
    try {
      // Fetch all contacts
      const allContactsResponse = await contactService.getContacts({
        organizationId: contactList.organizationId,
        page: 1,
        limit: 1000, // Get all contacts
      });

      // Fetch contacts already in the list
      const listContactsResponse = await contactListService.getListContacts(
        contactList.id
      );

      setAllContacts(allContactsResponse.data?.data || []);
      setListContacts(listContactsResponse.data?.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts that are NOT in the list (for adding)
  const availableContacts = useMemo(() => {
    const listContactIds = new Set(listContacts.map((c) => c.id));
    return allContacts.filter((contact) => !listContactIds.has(contact.id));
  }, [allContacts, listContacts]);

  // Search filtered contacts
  const filteredAvailableContacts = useMemo(() => {
    if (!searchTerm) return availableContacts;
    const term = searchTerm.toLowerCase();
    return availableContacts.filter(
      (contact) =>
        contact.email.toLowerCase().includes(term) ||
        contact.firstName?.toLowerCase().includes(term) ||
        contact.lastName?.toLowerCase().includes(term) ||
        contact.company?.toLowerCase().includes(term)
    );
  }, [availableContacts, searchTerm]);

  // Search contacts in the list (for removing)
  const filteredListContacts = useMemo(() => {
    if (!searchTerm) return listContacts;
    const term = searchTerm.toLowerCase();
    return listContacts.filter(
      (contact) =>
        contact.email.toLowerCase().includes(term) ||
        contact.firstName?.toLowerCase().includes(term) ||
        contact.lastName?.toLowerCase().includes(term) ||
        contact.company?.toLowerCase().includes(term)
    );
  }, [listContacts, searchTerm]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = (contacts: Contact[]) => {
    const contactIds = contacts.map((c) => c.id);
    setSelectedContactIds((prev) => {
      const allSelected = contactIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !contactIds.includes(id));
      } else {
        return [...new Set([...prev, ...contactIds])];
      }
    });
  };

  const handleAddContacts = async () => {
    if (!contactList || selectedContactIds.length === 0) return;

    setLoading(true);
    try {
      await contactListService.addContactsToList(contactList.id, {
        contactIds: selectedContactIds,
      });

      toast.success(`Added ${selectedContactIds.length} contact(s) to list`);
      setSelectedContactIds([]);
      await fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to add contacts to list"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContacts = async () => {
    if (!contactList || selectedContactIds.length === 0) return;

    setLoading(true);
    try {
      await contactListService.removeContactsFromList(contactList.id, {
        contactIds: selectedContactIds,
      });

      toast.success(
        `Removed ${selectedContactIds.length} contact(s) from list`
      );
      setSelectedContactIds([]);
      await fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to remove contacts from list"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedContactIds([]);
    setSearchTerm("");
    setActiveTab("add");
    onClose();
  };

  const renderContactItem = (contact: Contact) => {
    const isSelected = selectedContactIds.includes(contact.id);

    return (
      <div
        key={contact.id}
        className="flex items-start space-x-3 p-3 hover:bg-accent rounded-md cursor-pointer"
        onClick={() => handleSelectContact(contact.id)}
      >
        <Checkbox checked={isSelected} />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {contact.firstName} {contact.lastName}
            </span>
            {contact.status && (
              <Badge
                variant={contact.status === "ACTIVE" ? "default" : "secondary"}
              >
                {contact.status}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{contact.email}</div>
          {contact.company && (
            <div className="text-xs text-muted-foreground">
              {contact.company}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Contacts</DialogTitle>
          <DialogDescription>
            Add or remove contacts from "{contactList?.name}"
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "add" | "remove")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contacts ({availableContacts.length})
            </TabsTrigger>
            <TabsTrigger value="remove">
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Contacts ({listContacts.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select/Deselect All */}
            {activeTab === "add" && filteredAvailableContacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(filteredAvailableContacts)}
              >
                {filteredAvailableContacts.every((c) =>
                  selectedContactIds.includes(c.id)
                )
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            )}

            {activeTab === "remove" && filteredListContacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(filteredListContacts)}
              >
                {filteredListContacts.every((c) =>
                  selectedContactIds.includes(c.id)
                )
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            )}

            {/* Contacts List */}
            <TabsContent value="add" className="mt-0">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredAvailableContacts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAvailableContacts.map(renderContactItem)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "No contacts found matching your search"
                      : "All contacts are already in this list"}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="remove" className="mt-0">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredListContacts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredListContacts.map(renderContactItem)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "No contacts found matching your search"
                      : "No contacts in this list"}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedContactIds.length} contact(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            {activeTab === "add" ? (
              <Button
                onClick={handleAddContacts}
                disabled={loading || selectedContactIds.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Selected ({selectedContactIds.length})
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleRemoveContacts}
                disabled={loading || selectedContactIds.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Selected ({selectedContactIds.length})
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
