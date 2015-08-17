---
layout: post
title: IncePCtion - Recap on persistence techniques on modern desktop PCs
---

After coming back from my first DefCon and having attended several talks that circled around variations of this topic, I realized I needed to write this post in order to consolidate my knowledge on the topic of persistence techniques. Hopefully this will be useful to others.

Modern PC’s are increasingly complex and so are their OS’s. It’s important to understand the abundance of ways an attacker can achieve persistence after compromising a computer. 

My objective with this post is to enumerate all the different ways persistence can be achieved after compromising a desktop computer (Windows/Linux/OSX) in a generic form. Instead of repeating the work of others, I’ll refer to the more technical articles as needed.

So without further ado, let’s start the inception process. We’ll start from the surface and will gradually dive deeper and deeper into the system’s “subconscious” states.


## 1. User-space persistence

It’s the oldest and still the most common form of persistence. On Unix/Linux systems this usually means patching some SUID binary or service. In Windows systems it usually means running a malicious process in the background on system startup. I’d also argue that’s the easiest to detect, but is still extremely effective in most cases.

This is your standard userspace (ring 3) rootkit.


## 2. Kernel-space persistence

This technique involves loading a kernel module or driver into kernel memory, so that the malicious code runs without most of the OS restrictions. It’s also much harder to detect, because it runs in kernel space. It usually involves patching a kernel function or service.
While harder to detect this, this mechanism still requires the modification of operating system files (a malicious driver, kernel module, etc.). 

This is your typical “ring 0” rootkit.


## 3. Virtual Machine Based Rootkit

This is more commonly known as the [Blue Pill](https://en.wikipedia.org/wiki/Blue_Pill_(software)) attack, made famous by Joanna Rutkowska in 2006. This technique involves using the CPU’s built-in virtualization helpers (AMD-V, Intel’s VT-x) to create a thin hypervisor/VMM that sits between the OS’s and the host machine. Hardware interrupts and nearly any other computer function can be handled by the VMM, so malicious code can be executed this way and hidden from all levels of the OS.

Note that some recent OS’s already use VMM’s natively for compartmentalization. For instance, Windows 10 uses a thin hypervisor to abstract the security module that holds the user’s credentials (LSASS) in a [separate VM](http://blog.varonis.com/windows-10s-security-reboot-part-authentication/) away from the main OS. This means that not even ring 0 code running in the main OS can access the VM that holds the LSASS process.

This is also called a “ring -1” rootkit.


## 4. BIOS / UEFI patching

This method involves patching the BIOS firmware in order to achieve persistence. It usually needs another method to interact with the OS, such as malicious userland code that takes advantage of the patched BIOS functions.
Usually the BIOS is write-protected during OS execution and its update process uses signature verifications, but sometimes vulnerabilities are found on that process that allow rogue firmware modifications. 

There are several ways of achieving persistence by modifying BIOS code and most of the other low level persistence techniques require this. A simple form of BIOS persistence is the modification of the S3 [Boot Scripts](https://events.ccc.de/congress/2014/Fahrplan/system/attachments/2566/original/venamis_whitepaper.pdf) table to include malicious code that gets executed when the system resumes from sleep.

My fellow portuguese researcher @osxreverser found an interesting bug on most of Apple’s Macbook laptops that allow [patching the firmware](https://reverse.put.as/2015/05/29/the-empire-strikes-back-apple-how-your-mac-firmware-security-is-completely-broken/) from the operating system. This of course should not be possible, but most PC architectures still have insecure or buggy BIOS upgrade paths.

On this topic it is worth mentioning yet another blunder by Lenovo: It was recently discovered that they use a special ACPI table stored in the BIOS called [Windows Platform Binary Table](https://www.reddit.com/r/sysadmin/comments/3gq1xn/windows_platform_binary_table/) to install a [persistent “rootkit”](http://www.theregister.co.uk/2015/08/12/lenovo_firmware_nasty/) on some of their retail machines.

Also make sure to read about the curious case of [BadBIOS](http://arstechnica.com/security/2013/10/meet-badbios-the-mysterious-mac-and-pc-malware-that-jumps-airgaps/).


## 5. GPU / Ethernet / Option ROM patching

The BIOS / UEFI is not the only non-volatile code that is executed each time your computer starts. Every device connected to the PCI bus is handed execution flow by the BIOS on startup. The idea is to load drivers into memory, setup the hardware, PXE boot process, etc. The firmware of these devices can also be patched to achieve persistence.

Notorious examples are [GPU rootkits](http://arstechnica.com/security/2015/05/gpu-based-rootkit-and-keylogger-offer-superior-stealth-and-computing-power/) such as [jellyfish](https://github.com/x0r1/jellyfish) and [Demon](https://github.com/x0r1/Demon), [Ethernet firmware](http://esec-lab.sogeti.com/static/publications/11-recon-nicreverse_slides.pdf) rootkits, etc.


## 6. SMM Rootkits

[System Management Mode](https://en.wikipedia.org/wiki/System_Management_Mode) (or SMM) is a special mode of execution in modern PC’s to handle special hardware functions like power management, system hardware control, or proprietary OEM designed code. Usually, an SMI interrupt is triggered by an hardware function and the CPU enters a special mode of execution. Note that this special SMI interrupt cannot be caught by the operating system. While in this SMM mode a special block of memory (the SMRAM) can be read or written to, remaining protected from the OS. The rootkit works by patching/backdooring the SMI handler that exists in SMRAM. 

Make sure to read this [paper](http://www.eecs.ucf.edu/~czou/research/SMM-Rootkits-Securecom08.pdf) for more information. 

This is also called a “ring -2” rootkit.


## 7. Active Management Engine Rootkits

Most business PC architectures have a dedicated processor running parallel to the main CPU, to provide administrative functions and special remote access. Most notably, Intel’s vPro architecture has a dedicated (non-IA32) CPU with access to dedicated DRAM and direct access to the network card. The software that runs all this is stored in the BIOS chip and can be modified to achieve persistence.

This is fundamentally different from SMM rootkits because the persistent code is going to run on a physically distinct processor, not on the main CPU.

These [slides](https://www.blackhat.com/presentations/bh-usa-09/WOJTCZUK/BHUSA09-Wojtczuk-AtkIntelBios-SLIDES.pdf) talk extensively the intel AMT architecture and how to attack it.

Some PC’s also include what’s called a Baseboard Management Controller (BMC) that runs a special protocol (IPMI) designed to remotely manage the system. This is also independent from the main OS and CPU, and could be backdoored to achieve persistence. For more information on BMC and IPMI it is useful to refer to the research done by HD Moore [here](https://community.rapid7.com/community/metasploit/blog/2013/07/02/a-penetration-testers-guide-to-ipmi). 

These are also known as “ring -3” rootkits.


## 8. Peripheral controllers

An elegant form of persistence is patching the firmware of peripherals of the system, such as USB controllers, Hard Drive controllers, keyboard controllers, LTE / 4G cards, etc.

This is a particularly elegant way of persistence because the main CPU and/or BIOS does not have an easy way of verifying the code running on peripheral hardware. Also, most of these peripherals have vulnerable firmware update paths that facilitate backdooring.

There is interesting work published on this topic:

* [LTE / 4G](https://media.defcon.org/DEF%20CON%2023/DEF%20CON%2023%20presentations/Speaker%20&%20Workshop%20Materials/Mickey%20Shkatov%20&%20Jesse%20Michael/DEFCON-23-Mickey-Shkatov-Jesse-Michael-Scared-poopless-LTE-a.pdf): great presentation on Defcon 23 on patching a LTE module of a PC/Tablet to achieve persistence.
* [BadUSB](https://srlabs.de/blog/wp-content/uploads/2014/07/SRLabs-BadUSB-BlackHat-v1.pdf): Research led by Karsten Nohl that uses “evil” USB peripherals to flash and persist on USB controller firmware. 
* Hard Drive Controllers: The recent paper on the Equation Group by Kaspersky details the backdooring of Hard Drive [controller chips](http://arstechnica.com/information-technology/2015/02/how-hackers-could-attack-hard-drives-to-create-a-pervasive-backdoor/). There is also a public presentation on this topic made on 2013 and linked [here](http://spritesmods.com/?art=hddhack).


## 9. CPU Microcode

The Intel CPU has software microcode that contains the low level code that dictates how it executes its opcodes. This microcode can be updated from the original version that was “burned” inside the main CPU. Usually these microcode updates are done by the firmware because they are not persistent (must be reapplied on system reboot), but they can be done also by the operating system.

To prevent tampering, Intel has verifications in place that prevent the loading of malicious microcode. The Intel microcode update process has been thoroughly investigated by Ben Hawkes in this [great paper](http://inertiawar.com/microcode/).

As far as I know no similar research exists for the AMD microcode update process.

In case an attacker could modify the CPU’s microcode, persistence could be achieved by implementing a special CPU opcode or patching an existing one that removed security restrictions for a given OS process if the opcode is called with the correct parameters.

It’s a theoretic possibility that Intel, AMD or a state sponsored actor such as the NSA could have such backdoor in place.


## 10. Hardware based implants

Finally a passing reference to the lowest possible form of backdooring: having access to hardware and modifying it. The leaked NSA files show that they implanted systems by inserting devices on them, such as JTAG implants, console ports, Ethernet ports. Etc.

This remains outside of the realm of possibility for most attackers but is extremely hard to detect if done well.


## Conclusion

After putting all this together it seems amazing that there are so many mechanisms to hide the presence of an attacker inside a modern PC.

I've tried to make this post as complete as possible, but it’s possible that I missed something. DM or mention me at @lgrangeia with links to other work and / or persistence mechanisms and I’ll update this post accordingly. 

